import json
import re
import os
import html
import time
from urllib.request import urlopen, Request
from urllib.error import URLError
import ssl

# Desactivar verificación SSL para evitar problemas
ssl._create_default_https_context = ssl._create_unverified_context

print("="*60)
print("📚 EXTRACCIÓN DE METADATOS Y VALIDACIÓN DE IMÁGENES")
print("📌 SIN REQUESTS - Usando urllib nativo")
print("="*60)

archivo_xml = 'bifurcaciones_entradas.xml'

# ============ FUNCIONES ============

def limpiar_cdata(texto):
    if not texto:
        return ""
    texto = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', texto, flags=re.DOTALL)
    texto = html.unescape(texto)
    return texto

def extraer_posts_completos(archivo_xml):
    print(f"\n📂 Procesando archivo: {archivo_xml}")
    
    if not os.path.exists(archivo_xml):
        print(f"❌ El archivo no existe.")
        return []

    with open(archivo_xml, 'r', encoding='utf-8') as f:
        contenido = f.read()
    print(f"✅ Archivo leído: {len(contenido)} caracteres")

    items = re.split(r'<item>', contenido)[1:]
    print(f"🔍 Se encontraron {len(items)} elementos <item>")

    posts = []
    post_count = 0

    for idx, item in enumerate(items):
        post_type_match = re.search(r'<wp:post_type[^>]*>(.*?)</wp:post_type>', item, re.DOTALL)
        if not post_type_match:
            continue
        post_type = limpiar_cdata(post_type_match.group(1).strip())
        if post_type != 'post':
            continue
        post_count += 1

        titulo_match = re.search(r'<title>(.*?)</title>', item, re.DOTALL)
        titulo = limpiar_cdata(titulo_match.group(1).strip()) if titulo_match else 'Sin título'

        fecha_match = re.search(r'<wp:post_date>(.*?)</wp:post_date>', item, re.DOTALL)
        fecha = limpiar_cdata(fecha_match.group(1).strip()) if fecha_match else '2000-01-01 00:00:00'

        link_match = re.search(r'<link>(.*?)</link>', item, re.DOTALL)
        enlace = limpiar_cdata(link_match.group(1).strip()) if link_match else ''

        contenido_match = re.search(r'<content:encoded>(.*?)</content:encoded>', item, re.DOTALL)
        contenido_post = limpiar_cdata(contenido_match.group(1).strip()) if contenido_match else ''

        posts.append({
            'titulo': titulo,
            'fecha': fecha,
            'enlace': enlace,
            'contenido': contenido_post
        })

        if (idx + 1) % 50 == 0:
            print(f"   Procesados {idx + 1} items, {post_count} posts...")

    print(f"✅ Total: {len(items)} items, {post_count} posts.")
    return posts

def extraer_urls_imagenes(html_content):
    if not html_content:
        return []
    pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
    return re.findall(pattern, html_content)

def validar_url_con_urllib(url, timeout=5):
    """Valida una URL usando urllib (sin requests)"""
    try:
        req = Request(url, method='HEAD')
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        with urlopen(req, timeout=timeout) as response:
            return response.getcode() == 200
    except URLError as e:
        return False
    except Exception as e:
        return False

# ============ MAIN ============

print(f"\n📂 Buscando archivo: {archivo_xml}")

if not os.path.exists(archivo_xml):
    print(f"❌ El archivo '{archivo_xml}' no existe en la carpeta actual.")
    print(f"📁 Carpeta actual: {os.getcwd()}")
    print("\n📋 Archivos XML en esta carpeta:")
    for archivo in os.listdir('.'):
        if archivo.endswith('.xml'):
            print(f"   - {archivo}")
    exit()

print("✅ Archivo encontrado")

# 1. Extraer posts
start_time = time.time()
posts = extraer_posts_completos(archivo_xml)
elapsed = time.time() - start_time

if not posts:
    print("⚠️ No se encontraron posts.")
    exit()

print(f"✅ {len(posts)} posts extraídos en {elapsed:.2f} segundos")

# Guardar metadatos completos
with open('metadata_completo.json', 'w', encoding='utf-8') as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)
print(f"✅ Metadatos completos guardados en 'metadata_completo.json' ({os.path.getsize('metadata_completo.json')} bytes)")

# 2. Buscar imágenes
print("\n🔎 Extrayendo URLs de imágenes de los posts...")
todas_las_urls = []
detalles_imagenes = []

for i, post in enumerate(posts):
    titulo = post.get('titulo', 'Sin título')
    contenido = post.get('contenido', '')
    urls = extraer_urls_imagenes(contenido)
    
    for url in urls:
        todas_las_urls.append(url)
        detalles_imagenes.append({
            'titulo': titulo,
            'url': url
        })
    
    if (i + 1) % 20 == 0:
        print(f"   Procesados {i + 1} posts, {len(todas_las_urls)} imágenes encontradas...")

print(f"\n📸 Total de imágenes encontradas: {len(todas_las_urls)}")

if len(todas_las_urls) == 0:
    print("⚠️ No se encontraron imágenes en el contenido de los posts.")
    print("\n📝 Muestra del contenido del primer post:")
    if posts:
        print(posts[0].get('contenido', '')[:300])
    exit()

# 3. Validar TODAS las URLs
print("\n🌐 Verificando TODAS las imágenes...")
print(f"   Total: {len(todas_las_urls)} imágenes")
print("   (Esto puede tomar varios minutos)\n")

validas = []
invalidas = []

for i, url in enumerate(todas_las_urls):  # <--- QUITA EL [:10]
    print(f"   {i+1}/{len(todas_las_urls)}. Verificando: {url[:70]}...", end=" ")
    
    if validar_url_con_urllib(url, timeout=3):
        validas.append(url)
        print("✅ OK")
    else:
        invalidas.append(url)
        print("❌ FALLO")

# 4. Guardar resultados
resultados = {
    'total_imagenes': len(todas_las_urls),
    'validas': validas,
    'invalidas': invalidas,
    'detalles_imagenes': detalles_imagenes
}

with open('resultados_validacion.json', 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2)

# 5. Mostrar informe
print("\n" + "="*60)
print("📊 INFORME DE VALIDACIÓN DE IMÁGENES")
print("="*60)

total = resultados['total_imagenes']
validas_count = len(resultados['validas'])
invalidas_count = len(resultados['invalidas'])

print(f"🔍 Total de imágenes encontradas: {total}")
print(f"✅ Imágenes válidas (de 10 probadas): {validas_count}")
print(f"❌ Imágenes inválidas (de 10 probadas): {invalidas_count}")
print(f"📁 Resultados guardados en 'resultados_validacion.json'")

# Mostrar algunas imágenes inválidas
if invalidas_count > 0:
    print("\n" + "-"*60)
    print("❌ IMÁGENES INVÁLIDAS (primeras 5):")
    print("-"*60)
    for i, url in enumerate(invalidas[:5]):
        print(f"{i+1}. {url[:80]}...")

print("\n" + "="*60)
print("✅ SCRIPT COMPLETADO")
print(f"⏱️ Tiempo total: {time.time() - start_time:.2f} segundos")
print("="*60)