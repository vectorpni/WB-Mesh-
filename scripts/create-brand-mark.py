from PIL import Image,ImageDraw
im=Image.new('RGB',(512,512));p=im.load()
for y in range(512):
 for x in range(512):
  t=(x+y)/1022;p[x,y]=(round(203*(1-t)+84*t),round(17*(1-t)+33*t),round(171*(1-t)+168*t))
d=ImageDraw.Draw(im)
for points in [[(120,160),(256,88),(392,160),(256,240),(120,160)],[(120,240),(256,320),(392,240)],[(120,328),(256,408),(392,328)]]:
 d.line(points,fill='white',width=28,joint='curve')
im.save('assets/brand-mark.png')
