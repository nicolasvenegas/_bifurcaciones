import json
import re
import os
import html  # Para decodificar entidades HTML

def limpiar_cdata(texto):
    """Elimina las etiquetas CDATA y decodifica entidades HTML"""
    # Eliminar <![CDATA[ y ]]>
    texto = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', texto, flags=re.DOTALL)
    # Decodificar entidades HTML (&lt; → <, &gt; → >, &amp; → &, etc.)
    texto = html.unescape(texto)
    return texto

def extraer_posts_regex(archivo_xml):
    if not os.path.exists(archivo_xml):
        print(f"❌ El archivo '{archivo_xml}' no existe.")
        return []

    with open(archivo_xml, 'r', encoding='utf-8') as f:
        contenido = f.read()

    print("📄 Leyendo archivo...")
    items = re.split(r'<item>', contenido)[1:]
    print(f"🔍 Se encontraron {len(items)} elementos <item> en total.")

    posts = []
    post_count = 0
    for idx, item in enumerate(items):
        # Buscar wp:post_type
        post_type_match = re.search(r'<wp:post_type[^>]*>(.*?)</wp:post_type>', item, re.DOTALL)
        if not post_type_match:
            continue
        post_type = limpiar_cdata(post_type_match.group(1).strip())
        if post_type != 'post':
            continue
        post_count += 1

        # Título
        titulo_match = re.search(r'<title>(.*?)</title>', item, re.DOTALL)
        titulo = limpiar_cdata(titulo_match.group(1).strip()) if titulo_match else 'Sin título'

        # Fecha
        fecha_match = re.search(r'<wp:post_date>(.*?)</wp:post_date>', item, re.DOTALL)
        fecha = limpiar_cdata(fecha_match.group(1).strip()) if fecha_match else '2000-01-01 00:00:00'

        # Contenido (content:encoded)
        contenido_match = re.search(r'<content:encoded>(.*?)</content:encoded>', item, re.DOTALL)
        contenido_texto = limpiar_cdata(contenido_match.group(1).strip()) if contenido_match else ''

        # Categorías
        categorias = re.findall(r'<category domain="category"[^>]*>(.*?)</category>', item, re.DOTALL)
        categorias = [limpiar_cdata(c).strip() for c in categorias if c.strip()]
        if not categorias:
            categorias = ['sin categoría']

        posts.append({
            'titulo': titulo,
            'fecha': fecha,
            'contenido': contenido_texto,
            'categorias': categorias
        })

        if (idx + 1) % 100 == 0:
            print(f"📊 Procesados {idx + 1} items, {post_count} posts encontrados...")

    print(f"📊 Total: {len(items)} items, {post_count} posts.")
    return posts

if __name__ == '__main__':
    archivo = 'bifurcaciones_entradas.xml'
    print(f"📂 Buscando archivo: {archivo}")
    posts = extraer_posts_regex(archivo)

    if not posts:
        print("⚠️ No se encontraron posts.")
    else:
        with open('contenidos.json', 'w', encoding='utf-8') as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)
        print(f"✅ ¡Conversión exitosa! {len(posts)} posts guardados en contenidos.json")