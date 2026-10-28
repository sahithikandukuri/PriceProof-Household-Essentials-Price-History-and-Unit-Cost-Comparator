// PriceProof: Request Input Validation Middleware

/**
 * Validates request body fields against expected types and constraints
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rules] of Object.entries(schema)) {
      const val = body[field];

      if (rules.required && (val === undefined || val === null || val === '')) {
        errors.push(`Field '${field}' is required.`);
        continue;
      }

      if (val !== undefined && val !== null && val !== '') {
        if (rules.type === 'number' && (isNaN(Number(val)) || typeof val === 'boolean')) {
          errors.push(`Field '${field}' must be a valid number.`);
        }

        if (rules.type === 'string' && typeof val !== 'string') {
          errors.push(`Field '${field}' must be a text string.`);
        }

        if (rules.min !== undefined && Number(val) < rules.min) {
          errors.push(`Field '${field}' must be at least ${rules.min}.`);
        }

        if (rules.max !== undefined && Number(val) > rules.max) {
          errors.push(`Field '${field}' must be at most ${rules.max}.`);
        }

        if (rules.enum && !rules.enum.includes(val)) {
          errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}.`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
}

module.exports = {
  validate,
};
