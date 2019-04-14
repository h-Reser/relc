type Colors = {
  [key: string]: string;
}

class Logger {

  private static appName: string = "relc";

  private static colors: Colors = {
    grey: "\u001b[30;1m",
    red: "\u001b[31m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    blue: "\u001b[34m",
    reset: "\u001b[0m",
  }

  private constructor() { }

  private static print(str: string, colorKey: keyof Colors) {
    console.log(
      this.colors[colorKey]
      + `[${this.appName}] `
      + str
      + this.colors.reset
    );
  }

  public static dimmed(str: string): void {
    this.print(str, "grey");
  }

  public static error(str: string): void {
    this.print(str, "red");
  }

  public static info(str: string): void {
    this.print(str, "blue");
  }

  public static log(str: string): void {
    this.print(str, "reset");
  }

  public static success(str: string): void {
    this.print(str, "green");
  }

  public static warn(str: string): void {
    this.print(str, "yellow");
  }

}

export default Logger;