-- 1. Elevar privilegios temporalmente para modificar políticas de sistema
SET ROLE postgres;

-- 2. Asegurar que el bucket existe y es público
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-files', 'module-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Habilitar seguridad a nivel de fila (Requerido)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Borrar políticas viejas (Si falla, ignora esta parte y ve al paso 5)
DROP POLICY IF EXISTS "Universal Access module-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow All module-files" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- 5. Crear la POLÍTICA MAESTRA (Acceso total para este bucket)
CREATE POLICY "Universal Access module-files"
ON storage.objects
FOR ALL
USING ( bucket_id = 'module-files' )
WITH CHECK ( bucket_id = 'module-files' );
