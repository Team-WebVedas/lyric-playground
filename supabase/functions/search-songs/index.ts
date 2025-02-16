
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search'
const MUSIXMATCH_API_URL = 'https://api.musixmatch.com/ws/1.1'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query, spotify_id } = await req.json()
    
    // Validate input parameters
    if (!query && !spotify_id) {
      return new Response(
        JSON.stringify({ error: 'Either query or spotify_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let spotifyData;
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

    const tokenData = await spotifyTokenResponse.json()
    if (!tokenData.access_token) {
      throw new Error('Failed to get Spotify access token')
    }

    const { access_token } = tokenData

    if (spotify_id) {
      // Fetch specific track by ID
      const trackResponse = await fetch(
        `https://api.spotify.com/v1/tracks/${spotify_id}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      
      if (!trackResponse.ok) {
        throw new Error(`Spotify API error: ${trackResponse.statusText}`)
      }
      
      const trackData = await trackResponse.json()
      spotifyData = { tracks: { items: [trackData] } }
    } else if (query) {
      // Search tracks
      const spotifyResponse = await fetch(
        `${SPOTIFY_SEARCH_URL}?q=${encodeURIComponent(query)}&type=track&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      
      if (!spotifyResponse.ok) {
        throw new Error(`Spotify API error: ${spotifyResponse.statusText}`)
      }
      
      spotifyData = await spotifyResponse.json()
    }

    if (!spotifyData?.tracks?.items?.length) {
      return new Response(
        JSON.stringify({ error: 'No tracks found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tracks = spotifyData.tracks.items.map((track: any) => ({
      spotify_id: track.id,
      title: track.name,
      artist: track.artists[0].name,
      preview_url: track.preview_url,
    }))

    // For each track, get lyrics from Musixmatch
    const tracksWithLyrics = await Promise.all(
      tracks.map(async (track: any) => {
        try {
          const lyricsResponse = await fetch(
            `${MUSIXMATCH_API_URL}/matcher.lyrics.get?q_track=${encodeURIComponent(
              track.title
            )}&q_artist=${encodeURIComponent(track.artist)}&apikey=${MUSIXMATCH_API_KEY}`
          )
          
          if (!lyricsResponse.ok) {
            console.error('Musixmatch API error:', lyricsResponse.statusText)
            return { ...track, lyrics: '' }
          }
          
          const lyricsData = await lyricsResponse.json()
          const lyrics = lyricsData.message?.body?.lyrics?.lyrics_body || ''
          return { ...track, lyrics }
        } catch (error) {
          console.error('Error fetching lyrics:', error)
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
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
