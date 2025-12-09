ALTER TABLE public.purchase_order_items
ADD COLUMN po_number text,
ADD COLUMN qty_received integer DEFAULT 0;

UPDATE public.purchase_order_items
SET qty_received = quantity
WHERE is_received = true;