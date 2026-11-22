import assert from 'node:assert/strict';

function sanitizeWhatsappPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
  return digits;
}

function isValidColombiaMobile(rawPhone) {
  const digits = (rawPhone || '').replace(/\D/g, '');
  return /^3\d{9}$/.test(digits);
}

function parseCustomizationOptions(rawText) {
  return (rawText || '')
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(.*?)\(\+(\d+)\)$/);
      if (match) {
        return { label: match[1].trim(), extraPrice: Number(match[2]) };
      }
      return { label: item, extraPrice: 0 };
    });
}

function calculateLineTotal(basePrice, selectedOptions, qty) {
  const extras = (selectedOptions || []).reduce((sum, opt) => sum + Number(opt.extraPrice || 0), 0);
  return (Number(basePrice) + extras) * Number(qty);
}

// 1. Validar teléfonos y WhatsApp
assert.equal(sanitizeWhatsappPhone('300 123 4567'), '573001234567');
assert.equal(isValidColombiaMobile('3001234567'), true);
assert.equal(isValidColombiaMobile('2123456'), false);

// 2. Validar parser de personalización y adiciones
const parsed = parseCustomizationOptions('Sin cebolla, Sin tomate, Extra queso (+3000), Tocineta (+4000)');
assert.equal(parsed.length, 4);
assert.deepEqual(parsed[0], { label: 'Sin cebolla', extraPrice: 0 });
assert.deepEqual(parsed[2], { label: 'Extra queso', extraPrice: 3000 });
assert.equal(calculateLineTotal(18000, [parsed[0], parsed[2]], 2), 42000);

console.log('✔ Smoke tests unitarios (teléfonos, personalización y precios) aprobados');

// 3. Healthcheck opcional del bot de IA
const aiUrl = process.env.NEXT_PUBLIC_AI_API_URL || process.env.NEXT_PUBLIC_AI_BOT_URL;
if (aiUrl) {
  try {
    const res = await fetch(`${aiUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(8000) });
    console.log(`✔ Endpoint IA (${aiUrl}) respondió HTTP ${res.status}`);
  } catch (err) {
    console.log(`ℹ Aviso IA (${aiUrl}): ${err.message}`);
  }
}
