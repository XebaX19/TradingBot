export class ScriptProgressBar {
  private current = 0;
  private total = 0;
  private label = "";
  private active = false;

  start(
    total: number,
    label: string
  ) {
    this.total =
      Math.max(1, total);
    this.current = 0;
    this.label = label;
    this.active = true;
    this.render();
  }

  advance(
    detail?: string
  ) {
    if (!this.active) {
      return;
    }

    this.current =
      Math.min(
        this.total,
        this.current + 1
      );

    this.render(detail);
  }

  finish(
    detail?: string
  ) {
    if (!this.active) {
      return;
    }

    this.current = this.total;
    this.render(detail);
    process.stdout.write("\n");
    this.active = false;
  }

  stage(
    message: string
  ) {
    process.stdout.write(
      `${message}\n`
    );
  }

  private render(
    detail?: string
  ) {
    const width = 24;
    const ratio =
      this.current / this.total;
    const filled =
      Math.round(ratio * width);
    const bar =
      `${"=".repeat(filled)}${" ".repeat(width - filled)}`;
    const percent =
      Math.round(ratio * 100)
        .toString()
        .padStart(3, " ");
    const suffix =
      detail
        ? ` ${detail}`
        : "";

    process.stdout.write(
      `\r[${bar}] ${percent}% ${this.label} (${this.current}/${this.total})${suffix}`
    );
  }
}
