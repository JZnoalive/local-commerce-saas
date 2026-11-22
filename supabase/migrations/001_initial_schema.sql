-- Habilitar extensión para generar identificadores únicos (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Negocios / Comercios Locales
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    category VARCHAR(60) NOT NULL,
    phone_whatsapp VARCHAR(25) NOT NULL,
    address TEXT,
    is_manually_paused BOOLEAN DEFAULT FALSE,
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Horarios de Operación (0 = Domingo, 6 = Sábado)
CREATE TABLE business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    UNIQUE(business_id, day_of_week)
);

-- 3. Tabla de Inventario y Catálogo de Productos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Pedidos (Web y Chatbot WhatsApp)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(25) NOT NULL,
    delivery_address TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled')),
    source VARCHAR(20) DEFAULT 'web' CHECK (source IN ('web', 'whatsapp_bot')),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Detalle de Ítems por Pedido
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL
);

-- Índices para acelerar las búsquedas del Chatbot IA y el Catálogo
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_orders_business_status ON orders(business_id, status);
