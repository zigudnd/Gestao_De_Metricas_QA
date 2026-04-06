'use strict';

const { z } = require('zod');

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  display_name: z.string().min(1, 'Nome é obrigatório').max(100),
  global_role: z.enum(['admin', 'gerente', 'user']).optional(),
});

const resetPasswordSchema = z.object({
  user_id: z.string().uuid('user_id deve ser UUID válido'),
});

const dashboardPayloadSchema = z.object({
  payload: z.record(z.string(), z.any()).refine(val => !Array.isArray(val), 'Payload não pode ser array'),
});

// ── validateBody middleware factory ──────────────────────────────────────────

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: result.error.issues.map(i => i.message),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

module.exports = {
  validateBody,
  createUserSchema,
  resetPasswordSchema,
  dashboardPayloadSchema,
};
