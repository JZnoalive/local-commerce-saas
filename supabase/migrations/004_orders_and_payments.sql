ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS payment_info TEXT NOT NULL DEFAULT 'Nequi / Efectivo contra entrega';

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir crear pedidos publicos" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leer pedidos" ON orders FOR SELECT USING (true);
CREATE POLICY "Permitir actualizar estado de pedidos" ON orders FOR UPDATE USING (true);
