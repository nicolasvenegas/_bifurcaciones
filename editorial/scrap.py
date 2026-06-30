from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import json
import time
import os

def encontrar_chromedriver():
    """Busca chromedriver en ubicaciones comunes"""
    posibles_rutas = [
        "chromedriver.exe",
        "chromedriver/chromedriver.exe",
        "C:/chromedriver/chromedriver.exe",
        "C:/Program Files/Google/Chrome/chromedriver.exe",
        os.path.expanduser("~/chromedriver/chromedriver.exe"),
    ]
    for ruta in posibles_rutas:
        if os.path.exists(ruta):
            return ruta
    return None

def extraer_con_selenium():
    print("="*60)
    print("🕷️ WEB SCRAPING - CHOSE COMMUNE (SIN WEBDRIVER_MANAGER)")
    print("="*60)
    
    # Verificar chromedriver
    chromedriver_path = encontrar_chromedriver()
    if not chromedriver_path:
        print("❌ No se encontró chromedriver.exe")
        print("💡 Descárgalo desde: https://googlechromelabs.github.io/chrome-for-testing/")
        print("   Coloca chromedriver.exe en la carpeta actual o en C:/chromedriver/")
        return []
    
    # Configurar Chrome
    print("\n🌐 Iniciando navegador...")
    options = Options()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    # options.add_argument('--headless')  # Descomentar para ejecutar en segundo plano
    
    try:
        service = Service(chromedriver_path)
        driver = webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"❌ Error al iniciar Chrome: {e}")
        print("💡 Asegúrate de que Chrome esté instalado")
        return []
    
    try:
        # Cargar la página
        print("📄 Cargando página principal...")
        driver.get("https://chosecommune.com")
        time.sleep(5)  # Esperar carga
        
        # Hacer scroll para cargar más productos
        print("📜 Haciendo scroll para cargar productos...")
        for i in range(3):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.3);")
            time.sleep(1)
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.6);")
            time.sleep(1)
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
        
        # Buscar productos
        print("🔍 Buscando productos...")
        
        # Selectores posibles
        selectores = [
            ".product-item",
            ".product-card",
            ".grid-product",
            ".collection-product",
            "[data-product-id]",
            "article.product",
            ".product-grid-item",
            ".product-block",
            ".product",
            ".grid__item",
            ".shopify-product",
        ]
        
        elementos = []
        for selector in selectores:
            try:
                encontrados = driver.find_elements(By.CSS_SELECTOR, selector)
                if encontrados and len(encontrados) > 3:
                    print(f"✅ Encontrados {len(encontrados)} elementos con selector: {selector}")
                    elementos = encontrados
                    break
            except:
                continue
        
        # Si no hay productos, buscar imágenes grandes
        if not elementos:
            print("🔍 Buscando imágenes como alternativa...")
            imagenes = driver.find_elements(By.CSS_SELECTOR, "img[src*='.jpg'], img[src*='.png']")
            elementos = [img for img in imagenes if img.get_attribute('width') not in ['', '1', '20', '50']]
            print(f"🖼️ Imágenes encontradas: {len(elementos)}")
        
        productos = []
        for i, elem in enumerate(elementos[:40]):  # Límite de 40
            try:
                # Obtener HTML del elemento para depuración
                html_elem = elem.get_attribute('outerHTML')[:200]
                
                # Buscar imagen
                img = elem.find_element(By.TAG_NAME, "img") if elem.tag_name != "img" else elem
                img_url = img.get_attribute("src") or img.get_attribute("data-src") or img.get_attribute("data-srcset")
                
                # Limpiar URL
                if img_url and ',' in img_url:
                    img_url = img_url.split(',')[0].strip().split(' ')[0]
                
                # Buscar título
                titulo = elem.text.strip()
                if not titulo or len(titulo) < 3:
                    try:
                        titulo_elem = elem.find_element(By.CSS_SELECTOR, "h2, h3, h4, .title, .product-title, .product-name, .heading")
                        titulo = titulo_elem.text.strip()
                    except:
                        titulo = f"Producto {i+1}"
                
                # Buscar precio
                precio = None
                try:
                    precio_elem = elem.find_element(By.CSS_SELECTOR, ".price, .product-price, .money, .sale-price, .price-item")
                    precio = precio_elem.text.strip()
                except:
                    pass
                
                # Buscar enlace
                enlace = None
                try:
                    link_elem = elem.find_element(By.TAG_NAME, "a") if elem.tag_name != "a" else elem
                    enlace = link_elem.get_attribute("href")
                except:
                    pass
                
                # Limpiar título
                titulo = titulo.replace('\n', ' ').strip()
                titulo = ' '.join(titulo.split())
                
                if img_url and titulo and len(titulo) > 2:
                    productos.append({
                        'titulo': titulo[:100],
                        'imagen': img_url,
                        'precio': precio,
                        'url': enlace
                    })
                    print(f"   ✅ {i+1}. {titulo[:50]}...")
                    
            except Exception as e:
                continue
        
        # Guardar resultados
        with open('productos_chosecommune_selenium.json', 'w', encoding='utf-8') as f:
            json.dump(productos, f, ensure_ascii=False, indent=2)
        
        print("\n" + "="*60)
        print("📊 RESUMEN")
        print("="*60)
        print(f"✅ Productos extraídos: {len(productos)}")
        print(f"💾 Datos guardados en: productos_chosecommune_selenium.json")
        
        if productos:
            print("\n📝 Primeros 5 productos:")
            for i, p in enumerate(productos[:5]):
                print(f"\n{i+1}. {p['titulo']}")
                print(f"   Imagen: {p['imagen'][:60]}...")
                if p['precio']:
                    print(f"   Precio: {p['precio']}")
        
        return productos
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        print("\n🔚 Cerrando navegador...")
        driver.quit()

if __name__ == '__main__':
    extraer_con_selenium()