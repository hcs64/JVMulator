
import java.awt.*;

public class example1 extends BufferedApplet
{
   int w = 0, h = 0;
   Font myFont = new Font("Courier", Font.ITALIC, 50);
   Color myColor = new Color(128, 200, 100, 128);
   boolean isMyMouseDown;
   int myX, myY;
   Color ovalColor = Color.black;

   int[] X = { 100, 230, 300 };
   int[] Y = { 100, 200, 100 };

   //long startTime = System.currentTimeMillis();

   double startTime = System.currentTimeMillis() / 1000.0;

   public boolean keyUp(Event e, int key) {
      System.err.println(key);
      switch (key) {
      case 'r':
         ovalColor = Color.red;
         break;
      case 'g':
         ovalColor = Color.green;
         break;
      case 'b':
         ovalColor = Color.blue;
         break;
      }
      return true;
   }

   public boolean mouseMove(Event e, int x, int y) {
      System.err.println(x + " " + y);
      return true;
   }

   public boolean mouseDown(Event e, int x, int y) {
      isMyMouseDown = true;
      myX = x;
      myY = y;
      return true;
   }

   public boolean mouseDrag(Event e, int x, int y) {
      myX = x;
      myY = y;
      return true;
   }

   public boolean mouseUp(Event e, int x, int y) {
      isMyMouseDown = false;
      return true;
   }

   public void render(Graphics g) {
      if (w == 0) {
         w = getWidth();
         h = getHeight();
      }

      double time = System.currentTimeMillis() / 1000.0 - startTime;

      g.setColor(Color.white);
      g.fillRect(0, 0, w, h);

      g.setColor(ovalColor);
      g.fillOval(100, 200, 200, 100);

      g.setColor(Color.black);
      g.setFont(myFont);
      g.drawString("hi mom!", 200 + (int)(100 * Math.sin(time)),
                              250 + (int)(100 * Math.cos(time)));

      g.drawString("" + time, 200, 300);

      Y[1] = 200 + (int)(20 * Math.sin(5 * time));
      g.setColor(Color.blue);
      g.fillPolygon(X, Y, 3);

      g.setColor(myColor);
      g.fillRoundRect(50, 130, 300, 50, 30, 30);

      g.setColor(Color.orange);
      g.fill3DRect(myX - 150, myY - 25, 300, 50, ! isMyMouseDown);
/*
      double x = 0.0000001;
      for (int n = 0 ; n < 1000000 ; n++)
         x = Math.pow(x, 1.000001);
*/
   }
}

