from PIL import Image
from collections import Counter
import os

path = os.path.abspath('public/assets/telas/reff oficial.jpeg')
img = Image.open(path).convert('RGB')
img = img.resize((300, 300))
pixels = list(img.getdata())
count = Counter(pixels)
quant = {}
for (r, g, b), cnt in count.most_common(50):
    key = (round(r/16)*16, round(g/16)*16, round(b/16)*16)
    quant[key] = quant.get(key, 0) + cnt
for (r, g, b), cnt in sorted(quant.items(), key=lambda x: -x[1])[:20]:
    print('#{:02x}{:02x}{:02x}'.format(r, g, b), cnt)
