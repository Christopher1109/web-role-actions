import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')!.replace('Bearer ', '')
    )

    if (!user) {
      throw new Error('Unauthorized')
    }

    console.log('Starting SQL file execution...')

    // Read the SQL file content
    const sqlFilePath = './anestesia_full_import.sql'
    const sqlContent = await Deno.readTextFile(sqlFilePath)
    
    // Split by semicolon to get individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      try {
        const { error } = await supabaseClient.rpc('exec_sql', {
          sql_query: statement + ';'
        })

        if (error) {
          console.error(`Error in statement ${i + 1}:`, error)
          errorCount++
          errors.push(`Statement ${i + 1}: ${error.message}`)
        } else {
          successCount++
        }

        // Log progress every 100 statements
        if ((i + 1) % 100 === 0) {
          console.log(`Progress: ${i + 1}/${statements.length} statements processed`)
        }
      } catch (error) {
        console.error(`Exception in statement ${i + 1}:`, error)
        errorCount++
        errors.push(`Statement ${i + 1}: ${error.message}`)
      }
    }

    console.log(`Execution complete. Success: ${successCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        totalStatements: statements.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // Return first 10 errors only
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
