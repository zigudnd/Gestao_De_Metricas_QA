#!/usr/bin/env node
/**
 * Seed local: cria usuários e dados iniciais para desenvolvimento.
 * Executar após `supabase start` e `supabase db push --local`.
 *
 * Uso: node scripts/seed-local.js
 *   ou: npm run seed
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY nao encontrada no .env')
  console.error('Execute: supabase status  para obter a key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = [
  { email: 'admin@tostatos.com', display_name: 'Admin', password: 'Admin@123!Ts', global_role: 'admin' },
  { email: 'gerente@tostatos.com', display_name: 'Gerente QA', password: 'Mudar@123!Ts', global_role: 'gerente' },
  { email: 'qa.lead@tostatos.com', display_name: 'QA Lead', password: 'Mudar@123!Ts', global_role: 'user' },
  { email: 'qa@tostatos.com', display_name: 'QA Analista', password: 'Mudar@123!Ts', global_role: 'user' },
  { email: 'stakeholder@tostatos.com', display_name: 'Stakeholder', password: 'Mudar@123!Ts', global_role: 'user' },
]

async function createUser(user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      display_name: user.display_name,
      must_change_password: user.email !== 'admin@tostatos.com',
    },
  })

  if (error) {
    if (error.message.includes('already')) {
      console.log(`  ⏭  ${user.email} — ja existe`)
      return null
    }
    console.error(`  ✗  ${user.email} — ${error.message}`)
    return null
  }

  console.log(`  ✓  ${user.email} — criado`)
  return data.user
}

async function setGlobalRole(email, role) {
  const { error } = await supabase
    .from('profiles')
    .update({ global_role: role })
    .eq('email', email)
  if (error) console.error(`  ✗  Erro ao setar role de ${email}: ${error.message}`)
}

async function ensureSquadMember(squadId, userId, role) {
  const { error } = await supabase.from('squad_members').upsert({
    squad_id: squadId,
    user_id: userId,
    role,
    permissions: role === 'qa_lead'
      ? { create_sprints:true,create_bugs:true,create_features:true,create_test_cases:true,create_suites:true,create_blockers:true,create_alignments:true,edit_sprints:true,edit_bugs:true,edit_features:true,edit_test_cases:true,edit_suites:true,edit_blockers:true,edit_alignments:true,delete_sprints:true,delete_bugs:true,delete_features:true,delete_test_cases:true,delete_suites:true,delete_blockers:true,delete_alignments:true }
      : role === 'qa'
        ? { create_sprints:true,create_bugs:true,create_features:true,create_test_cases:true,create_suites:true,create_blockers:true,create_alignments:true,edit_sprints:true,edit_bugs:true,edit_features:true,edit_test_cases:true,edit_suites:true,edit_blockers:true,edit_alignments:true,delete_sprints:false,delete_bugs:true,delete_features:false,delete_test_cases:true,delete_suites:false,delete_blockers:true,delete_alignments:true }
        : { create_sprints:false,create_bugs:false,create_features:false,create_test_cases:false,create_suites:false,create_blockers:false,create_alignments:false,edit_sprints:false,edit_bugs:false,edit_features:false,edit_test_cases:false,edit_suites:false,edit_blockers:false,edit_alignments:false,delete_sprints:false,delete_bugs:false,delete_features:false,delete_test_cases:false,delete_suites:false,delete_blockers:false,delete_alignments:false },
  }, { onConflict: 'squad_id,user_id' })
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ✗  Erro ao add membro ${userId} ao squad: ${error.message}`)
  }
}

async function main() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ToStatos — Seed Local')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 1. Criar usuarios
  console.log('1. Criando usuarios...')
  const createdUsers = {}
  for (const user of USERS) {
    const created = await createUser(user)
    if (created) createdUsers[user.email] = created.id
  }

  // Buscar IDs de todos os usuarios (incluindo os que ja existiam)
  const { data: profiles } = await supabase.from('profiles').select('id, email')
  const profileMap = new Map((profiles ?? []).map((p) => [p.email, p.id]))

  // 2. Setar global_roles
  console.log('\n2. Configurando roles...')
  for (const user of USERS) {
    if (user.global_role !== 'user') {
      await setGlobalRole(user.email, user.global_role)
      console.log(`  ✓  ${user.email} → ${user.global_role}`)
    }
  }

  // 3. Garantir squad QualityBeta
  console.log('\n3. Configurando squad QualityBeta...')
  const SQUAD_ID = 'a0000000-0000-0000-0000-000000000001'
  const { error: squadErr } = await supabase.from('squads').upsert({
    id: SQUAD_ID,
    name: 'QualityBeta',
    description: 'Squad padrao para onboarding',
    color: '#185FA5',
    archived: false,
  }, { onConflict: 'id' })
  if (squadErr) console.error(`  ✗  ${squadErr.message}`)
  else console.log('  ✓  Squad QualityBeta OK')

  // 4. Adicionar usuarios ao squad
  console.log('\n4. Adicionando membros ao QualityBeta...')
  const SQUAD_ROLES = {
    'admin@tostatos.com': 'qa_lead',
    'gerente@tostatos.com': 'qa_lead',
    'qa.lead@tostatos.com': 'qa_lead',
    'qa@tostatos.com': 'qa',
    'stakeholder@tostatos.com': 'stakeholder',
  }

  for (const [email, role] of Object.entries(SQUAD_ROLES)) {
    const userId = profileMap.get(email)
    if (userId) {
      await ensureSquadMember(SQUAD_ID, userId, role)
      console.log(`  ✓  ${email} → ${role}`)
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Seed concluido!')
  console.log('')
  console.log('  Usuarios criados:')
  for (const user of USERS) {
    console.log(`    ${user.email} / ${user.password} (${user.global_role})`)
  }
  console.log('')
  console.log('  ⚠  Usuarios com senha Mudar@123!Ts serao')
  console.log('     obrigados a trocar no primeiro login.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
}

main().catch((e) => { console.error(e); process.exit(1) })
