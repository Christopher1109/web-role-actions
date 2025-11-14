// Script temporal para ejecutar el SQL file
// Ejecutar con: deno run --allow-read --allow-env --allow-net execute_sql.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://nkwoiqlddngzvtrpmetu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rd29pcWxkZG5nenZ0cnBtZXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTYxODEsImV4cCI6MjA3ODAzMjE4MX0.OH4j3Bw7NacxIiIEmhDHeLcVLA36_4qlFhY__o-xuAk'
)

const sqlFile = await Deno.readTextFile('./anestesia_full_import.sql')
const statements = sqlFile.split(';').filter(s => s.trim() && !s.trim().startsWith('--'))

console.log(`Ejecutando ${statements.length} statements...`)

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i].trim()
  if (!stmt) continue
  
  try {
    await supabase.rpc('exec', { sql: stmt })
    if ((i + 1) % 100 === 0) {
      console.log(`Progreso: ${i + 1}/${statements.length}`)
    }
  } catch (error) {
    console.error(`Error en statement ${i + 1}:`, error)
  }
}

console.log('✅ Completado!')
