import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

class SIESScraper:
    def __init__(self, base_url="https://www.mifuturo.cl/bases-de-datos-de-matriculados/"):
        self.base_url = base_url
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    def get_download_links(self):
        print(f"Scrapeando links de descarga desde: {self.base_url}")
        try:
            response = requests.get(self.base_url, headers=self.headers, timeout=15)
            if response.status_code != 200:
                print(f"Error al acceder a la página: Código de estado {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            links = []
            
            # Buscar todos los enlaces que contengan archivos zip, rar, xlsx o csv
            for a_tag in soup.find_all('a', href=True):
                href = a_tag['href']
                text = a_tag.text.strip()
                
                if any(ext in href.lower() for ext in ['.zip', '.rar', '.xlsx', '.xls', '.csv']):
                    full_url = urljoin(self.base_url, href)
                    links.append({
                        'text': text,
                        'url': full_url,
                        'filename': os.path.basename(href)
                    })
                    
            print(f"Se encontraron {len(links)} archivos descargables disponibles.")
            return links
        except Exception as e:
            print(f"Excepción ocurrida durante el scraping: {e}")
            return []

    def download_file(self, url, dest_folder="data_raw"):
        if not os.path.exists(dest_folder):
            os.makedirs(dest_folder)
            
        filename = os.path.basename(url)
        dest_path = os.path.join(dest_folder, filename)
        
        print(f"Descargando {filename} desde {url}...")
        try:
            response = requests.get(url, headers=self.headers, stream=True, timeout=30)
            if response.status_code == 200:
                with open(dest_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"Descarga exitosa: {dest_path}")
                return dest_path
            else:
                print(f"Error al descargar. Código de estado: {response.status_code}")
                return None
        except Exception as e:
            print(f"Error durante la descarga de {url}: {e}")
            return None

if __name__ == "__main__":
    # Prueba del scraper
    scraper = SIESScraper()
    links = scraper.get_download_links()
    for l in links[:5]:
        print(f"- {l['text']}: {l['url']}")
