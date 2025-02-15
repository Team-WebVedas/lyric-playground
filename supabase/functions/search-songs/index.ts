
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
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

    // Search Spotify
    const spotifyResponse = await fetch(
      `${SPOTIFY_SEARCH_URL}?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    const spotifyData = await spotifyResponse.json()
    const tracks = spotifyData.tracks.items.map((track: any) => ({
      spotify_id: track.id,
      title: track.name,
      artist: track.artists[0].name,
    }))

    // For each track, get lyrics from Musixmatch
    const tracksWithLyrics = await Promise.all(
      tracks.map(async (track: any) => {
        const lyricsResponse = await fetch(
          `${MUSIXMATCH_API_URL}/matcher.lyrics.get?q_track=${encodeURIComponent(
            track.title
          )}&q_artist=${encodeURIComponent(track.artist)}&apikey=${MUSIXMATCH_API_KEY}`
        )
        const lyricsData = await lyricsResponse.json()
        const lyrics = lyricsData.message?.body?.lyrics?.lyrics_body || ''
        return { ...track, lyrics }
      })
    )

    return new Response(JSON.stringify(tracksWithLyrics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
