import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { checkPasswordPolicy } from '../passwordPolicy';

export default function PasswordRules({ password = '', username = '' }) {
  const rules = checkPasswordPolicy(password, username);
  return (
    <Box sx={{ pl: 0.5 }}>
      <Stack spacing={0.25}>
        {rules.map((r) => (
          <Stack key={r.label} direction="row" spacing={0.75} alignItems="center">
            {r.passed ? (
              <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            )}
            <Typography
              variant="caption"
              sx={{ color: r.passed ? 'success.dark' : 'text.secondary', fontSize: '0.72rem' }}
            >
              {r.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
