
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user progress stats
    const { data: stats, error: statsError } = await supabase
      .from('user_progress')
      .select('wpm, accuracy, completed_at')
      .eq('user_id', req.headers.get('user-id'))
      .order('completed_at', { ascending: true })

    if (statsError) throw statsError

    // Calculate average WPM and accuracy
    const averageWpm = stats.reduce((sum: number, record: any) => sum + record.wpm, 0) / (stats.length || 1)
    const averageAccuracy = stats.reduce((sum: number, record: any) => sum + Number(record.accuracy), 0) / (stats.length || 1)

    // Get the last 7 days of progress
    const last7DaysStats = stats
      .filter((record: any) => {
        const date = new Date(record.completed_at)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays <= 7
      })
      .reduce((acc: any, record: any) => {
        const date = new Date(record.completed_at).toLocaleDateString('en-US', { weekday: 'short' })
        if (!acc[date]) {
          acc[date] = { wpm: record.wpm, count: 1 }
        } else {
          acc[date].wpm = (acc[date].wpm * acc[date].count + record.wpm) / (acc[date].count + 1)
          acc[date].count += 1
        }
        return acc
      }, {})

    const progressData = Object.entries(last7DaysStats).map(([date, data]: [string, any]) => ({
      date,
      wpm: Math.round(data.wpm),
    }))

    const response = {
      averageWpm: Math.round(averageWpm),
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      songsCompleted: stats.length,
      progressData,
    }

    return new Response(JSON.stringify(response), {
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
