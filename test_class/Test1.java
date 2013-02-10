class Test1 {
    static final int s = 101+2;
    static int i = 127;
    public static void main(String [] args) {
        System.out.println("hello!");
        inc();
        System.out.println(i);
    }
    static void inc() {
        i ++;
    }
}
