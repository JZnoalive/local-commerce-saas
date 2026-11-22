cd ~/Proyectos/local-commerce-saas
cat << 'EOF' > supabase/migrations/002_permissions_and_rls.sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica de negocios" ON businesses FOR SELECT USING (true);
CREATE POLICY "Lectura publica de horarios" ON business_hours FOR SELECT USING (true);
CREATE POLICY "Lectura publica de productos" ON products FOR SELECT USING (true);
CREATE POLICY "Crear pedidos publicamente" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Crear items de pedido publicamente" ON order_items FOR INSERT WITH CHECK (true);
EOF
