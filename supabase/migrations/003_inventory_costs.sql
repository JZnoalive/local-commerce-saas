ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 5;

CREATE POLICY "Permitir insertar productos" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar productos" ON products FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminar productos" ON products FOR DELETE USING (true);
CREATE POLICY "Permitir actualizar negocios" ON businesses FOR UPDATE USING (true);
