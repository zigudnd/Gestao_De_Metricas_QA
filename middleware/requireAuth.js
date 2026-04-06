'use strict';

/**
 * Middleware: require admin or gerente role via Supabase Auth.
 *
 * Reads `supabaseAdmin` from `req.app.locals.supabase`.
 * On success, attaches `req.caller` (auth user) and `req.callerProfile`.
 */
async function requireAdminAuth(req, res, next) {
  const supabaseAdmin = req.app.locals.supabase;

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase não configurado.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('global_role')
      .eq('id', caller.id)
      .single();

    if (profileErr) {
      console.error('[requireAdminAuth] Erro ao buscar profile:', profileErr);
      return res.status(500).json({ error: 'Erro ao verificar perfil do usuário.' });
    }

    if (!callerProfile || (callerProfile.global_role !== 'admin' && callerProfile.global_role !== 'gerente')) {
      return res.status(403).json({ error: 'Apenas administradores podem executar esta ação.' });
    }

    req.caller = caller;
    req.callerProfile = callerProfile;
    next();
  } catch (err) {
    console.error('[requireAdminAuth] Falha:', err);
    return res.status(401).json({ error: 'Falha na autenticação.' });
  }
}

module.exports = { requireAdminAuth };
