from shapely.geometry import shape, Point as ShapePoint
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw, ImageFont
from fastapi.responses import Response
from geopy.distance import distance
from geopy.point import Point
from httpx import AsyncClient
from fastapi import FastAPI
from datetime import date
import shapefile
import pycountry
import random
import io

app = FastAPI()
http_client = AsyncClient()
WORLD = ["US", "IN", "CN", "BR", "RU", "FR", "CA", "AU", "MX", "ZA", "TH", "ES", "DE", "SE", "VN", "ID", "IT", "FI", "TR", "GB", "PL", "BD", "JP", "AR", "PK", "MY", "IR", "SA", "PH", "HU", "UZ", "CO", "NG", "KE", "UA", "MM", "CD", "UG", "DZ", "PE", "ML", "NL", "AT", "ET", "BE", "GR", "LK", "MN", "KR", "GH", "IE", "ZW", "NZ", "KZ", "TZ", "RO", "LT", "CH", "NP", "AZ", "UY", "DK", "ZM", "MA", "CZ", "KH", "EC", "TW", "TD", "LA", "SK", "SI", "LY", "AF", "KG", "BW", "MG", "MZ", "SD", "TJ", "HR", "PY", "KP", "CF", "NI", "CD", "BA", "JM", "LB", "GE", "TN", "CY", "DO", "IL", "BG", "NE", "GT", "SN", "BJ", "ER", "MW", "BF", "SO"]
AMERICAS = ["US", "BR", "CA", "MX", 'AR', 'PE', 'PY', 'NI', 'JM', 'DO', 'GT']
ASIA = ["IN", "CN", "RU", "TH", "ID", "VN", "JP", "MY", "SA", "PH", "UZ", "KG", "LA", "TJ", "KP", "MM", "MN", "KR", "TW", "KH", 'PK', 'IR', 'BD', 'KZ', 'NP', 'LK', 'IL']
AFRICA = ["ZA", "NG", "KE", "CD", "UG", "DZ", "ML", "GH", "ZW", "TZ", "BW", "MZ", "SD", "HR", "CF", "CD", "TN", "NE", "BJ", "ER", "MW", "BF", "SO", 'ZM', 'MA', 'TD', 'LY', 'AF', 'MG', 'SN']
EUROPE = ["FR", "DE", "SE", "IT", "FI", "TR", "GB", "PL", "NL", "AT", "BE", "GR", "IE", "RO", "LT", "CH", "AZ", "DK", "CZ", "SK", "SI", "CY", "BG", "BA", "HR", 'ES', 'HU', 'UA', 'ET', 'CO', 'UY', 'EC', 'LB', 'GE']
AUSTRALIA = ["AU", "NZ"]
indexed_PLACES = {0: WORLD, 1: AMERICAS, 2: EUROPE, 3: ASIA, 4: AFRICA, 5: AUSTRALIA}
indexed_PLACENAMES = {0: "World", 1: "America", 2: "Europe", 3: "Asia", 4: "Africa", 5: "Oceania"}
shapes = shapefile.Reader("./assets/World_Countries.shp")
records = shapes.records()
shapeRecs = shapes.shapeRecords()
special_cases = {"RU": "Russia", "IR": "Iran", "CD": "Congo", "LA": "Laos"}


async def random_point_in_country(country_code):
    country = pycountry.countries.get(alpha_2=country_code)
    country_id = None
    for i, rec in enumerate(records):
        if country.name == rec[0]:
            country_id = i
            break
        elif hasattr(country, 'official_name') and country.official_name == rec[0]:
            country_id = i
            break
        elif hasattr(country, 'common_name') and country.common_name == rec[0]:
            country_id = i
            break
        elif country_code in special_cases and special_cases[country_code] == rec[0]:
            country_id = i
            break
    if country_id is None:
        return None
    shp_geom = shape(shapeRecs[country_id].shape.__geo_interface__)
    minx, miny, maxx, maxy = shp_geom.bounds
    while True:
        p = ShapePoint(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if shp_geom.contains(p):
            return p.x, p.y


async def fetch_json(url):
    response = await http_client.get(url)
    response.raise_for_status()
    return response.json()


async def random_point(place):
    country = random.choice(indexed_PLACES[place])
    lon, lat = await random_point_in_country(country)
    return lat, lon


async def nearest_road_point(lat, lon):
    url = f"https://router.project-osrm.org/nearest/v1/driving/{lon},{lat}"
    data = await fetch_json(url)
    return data['waypoints'][0]['location'][1], data['waypoints'][0]['location'][0]


async def generate_random_coordinate(center_point):
    lower = 50
    upper = 1500
    destination = distance(kilometers=random.uniform(0, random.randint(lower, upper) * 1.60934)).destination(center_point, random.uniform(0, 360))
    return destination.latitude, destination.longitude


async def calculate_driving_time(start, end):
    url = f"https://router.project-osrm.org/route/v1/car/{start[1]},{start[0]};{end[1]},{end[0]}"
    response = await http_client.get(url)
    response.raise_for_status()
    return response.status_code == 200


async def reasonableCheck(start, end):
    url = f"https://router.project-osrm.org/route/v1/car/{start[1]},{start[0]};{end[1]},{end[0]}"
    data = await fetch_json(url)
    hours = (data["routes"][0]["duration"] / 3600)
    miles = (data["routes"][0]["distance"] / 1609)
    if (miles / hours) >= 15:
        return True
    return False


@app.get("/image/")
async def generate_grade_card(points: int = 0, country: int = 0):
    percent = points / 50000 * 100
    grades = {90: "A", 80: "B", 70: "C", 60: "D"}
    grade = "F"
    country = indexed_PLACENAMES[country]
    for threshold, letter in grades.items():
        if percent >= threshold:
            grade = letter
            break
    image = Image.new("RGB", (400, 600), (211, 211, 211))
    logo_image = Image.open(f"assets/{grade}.png").resize((122, 122))
    image.paste(logo_image, (400 - logo_image.width - 16, 8))
    draw = ImageDraw.Draw(image)
    draw.text((32, 32), str(points), font=ImageFont.truetype("assets/PublicPixel.ttf", size=42), fill=(16, 16, 16))
    draw.text((32, 74), "Points", font=ImageFont.truetype("assets/PublicPixel.ttf", size=35), fill=(48, 48, 48))
    draw.line([(24, 138), (image.width - 24, 138)], fill=(64, 64, 64), width=2)
    x = len(country) - 4
    x2 = 0
    if x == 2:
        x2 = 5
    elif x == 3:
        x2 = 25
    draw.text((40 - 6 * x + x2, 158 + 4), "In", font=ImageFont.truetype("assets/PublicPixel.ttf", size=30 - 4 * x), fill=(48, 48, 48))
    draw.text((124 - 15 * x + x2, 138 + 4 * x + 4), country, font=ImageFont.truetype("assets/PublicPixel.ttf", size=60 - 8 * x), fill=(32, 32, 32))
    date_today = date.today().strftime("%m/%d/%Y")
    draw.text((38, 220 - 4 * x + 3), "On", font=ImageFont.truetype("assets/PublicPixel.ttf", size=22), fill=(48, 48, 48))
    draw.text((104, 208 - 4 * x + 3), "DaWaze", font=ImageFont.truetype("assets/PublicPixel.ttf", size=44), fill=(32, 32, 32))
    draw.text((72, 264 - 4 * x + 3), date_today, font=ImageFont.truetype("assets/PublicPixel.ttf", size=26), fill=(42, 42, 42))
    draw.line([(24, 308 - 4 * x + 3), (image.width - 24, 308 - 4 * x + 3)], fill=(64, 64, 64), width=2)
    icon_image = Image.open("assets/Icon.png").resize((320, 102))
    image.paste(icon_image, (40, 312 - 4 * x + 3))
    image = image.crop((0, 0, 400, 420 - 4 * x + 3))
    image_buffer = io.BytesIO()
    image.save(image_buffer, format="PNG")
    return Response(content=image_buffer.getvalue(), headers={"Content-Disposition": "attachment; filename=dawaze.png", "Content-Type": "image/png"})


@app.get("/random/")
async def read_root(places: int = 0):
    attempts = 0
    max_attempts = 20
    while attempts < max_attempts:
        try:
            first_point = await nearest_road_point(*await random_point(places))
            second_point = await nearest_road_point(*await generate_random_coordinate(Point(first_point[0], first_point[1])))
            if first_point != second_point:
                drivable = await calculate_driving_time(first_point, second_point)
                if drivable:
                    reasonable = await reasonableCheck(first_point, second_point)
                    if reasonable:
                        return {"lat1": first_point[0], "lon1": first_point[1], "lat2": second_point[0], "lon2": second_point[1]}
                    else:
                        attempts += 1
                else:
                    attempts += 1
        except Exception as e:
            print(e)
            attempts += 1
    return {"error": "Could not find a suitable route. Please try again later."}


app.mount("/static/", StaticFiles(directory="static", html=False), name="static")
app.mount("/", StaticFiles(directory="web", html=True), name="web")
