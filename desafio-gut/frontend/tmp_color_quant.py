from PIL import Image
import os

path = os.path.abspath('public/assets/telas/reff oficial.jpeg')
img = Image.open(path).convert('RGB')
img = img.resize((500, 500))
quant = img.quantize(colors=12, method=2)
palette = quant.getpalette()
color_counts = sorted(quant.getcolors(), reverse=True)
for count, idx in color_counts:
    r = palette[idx*3]
    g = palette[idx*3+1]
    b = palette[idx*3+2]
    print('#{:02x}{:02x}{:02x}'.format(r, g, b), count)
