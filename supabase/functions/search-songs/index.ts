
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search'
const SPOTIFY_TRACK_URL = 'https://api.spotify.com/v1/tracks'
const MUSIXMATCH_API_URL = 'https://api.musixmatch.com/ws/1.1'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query, spotify_id } = await req.json()
    console.log('Received query:', query, 'spotify_id:', spotify_id); // Debug log

    if (!query && !spotify_id) {
      return new Response(
        JSON.stringify({ error: 'Either query or spotify_id parameter is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, MUSIXMATCH_API_KEY } = Deno.env.toObject()

    // Get Spotify access token
    const spotifyTokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    })

    const { access_token } = await spotifyTokenResponse.json()
    console.log('Got Spotify access token'); // Debug log

    let tracks = [];

    if (spotify_id) {
      // Fetch single track
      const trackResponse = await fetch(
        `${SPOTIFY_TRACK_URL}/${spotify_id}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      const trackData = await trackResponse.json()
      console.log('Spotify track data:', trackData); // Debug log

      if (trackData.error) {
        throw new Error(trackData.error.message);
      }

      tracks = [{
        spotify_id: trackData.id,
        title: trackData.name,
        artist: trackData.artists[0].name,
      }];
    } else {
      // Search tracks
      const spotifyResponse = await fetch(
        `${SPOTIFY_SEARCH_URL}?q=${encodeURIComponent(query)}&type=track&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )

      const spotifyData = await spotifyResponse.json()
      console.log('Spotify search results:', spotifyData); // Debug log

      if (!spotifyData.tracks?.items) {
        return new Response(
          JSON.stringify({ error: 'No tracks found' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      tracks = spotifyData.tracks.items.map((track: any) => ({
        spotify_id: track.id,
        title: track.name,
        artist: track.artists[0].name,
      }));
    }

    // For each track, get lyrics from Musixmatch
    const tracksWithLyrics = await Promise.all(
      tracks.map(async (track: any) => {
        try {
          const lyricsResponse = await fetch(
            `${MUSIXMATCH_API_URL}/matcher.lyrics.get?q_track=${encodeURIComponent(
              track.title
            )}&q_artist=${encodeURIComponent(track.artist)}&apikey=${MUSIXMATCH_API_KEY}`
          )
          const lyricsData = await lyricsResponse.json()
          console.log('Lyrics response for', track.title, ':', lyricsData); // Debug log
          const lyrics = lyricsData.message?.body?.lyrics?.lyrics_body || ''
          return { ...track, lyrics }
        } catch (error) {
          console.error('Error fetching lyrics:', error);
          return { ...track, lyrics: '' }
        }
      })
    )

    return new Response(JSON.stringify(tracksWithLyrics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
