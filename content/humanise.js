const humanise = {
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async humanType(element, text) {
    element.focus();
    await this.humanClick(element);

    this.setNativeValue(element, "");
    element.dispatchEvent(new Event("input", { bubbles: true }));

    const words = String(text).split(/(\s+)/);

    for (const word of words) {
      if (/\s+/.test(word)) {
        for (const char of word) {
          this.appendChar(element, char);
          await this.sleep(this.randomBetween(20, 60));
        }
        continue;
      }

      if (word && Math.random() < 0.05) {
        const typo = word[Math.floor(Math.random() * word.length)] || "x";
        this.appendChar(element, typo);
        await this.sleep(this.randomBetween(80, 150));
        element.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Backspace", bubbles: true })
        );
        element.value = element.value.slice(0, -1);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        await this.sleep(this.randomBetween(100, 200));
      }

      for (const char of word) {
        this.appendChar(element, char);
        await this.sleep(this.randomBetween(40, 130));
      }
    }

    element.dispatchEvent(new Event("change", { bubbles: true }));
  },

  appendChar(element, char) {
    if (element.isContentEditable) {
      element.textContent += char;
    } else {
      this.setNativeValue(element, (element.value || "") + char);
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
  },

  setNativeValue(element, value) {
    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  },

  async humanClick(element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    await this.sleep(this.randomBetween(200, 600));

    for (const type of ["mousedown", "mouseup", "click"]) {
      element.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, view: window })
      );
    }
    element.focus();
    await this.sleep(this.randomBetween(100, 300));
  },

  async humanSelect(selectElement, value) {
    await this.humanClick(selectElement);
    await this.sleep(this.randomBetween(150, 400));
    selectElement.value = value;
    selectElement.dispatchEvent(new Event("change", { bubbles: true }));
    await this.sleep(this.randomBetween(100, 250));
  },

  async staggeredFill(fields) {
    for (let i = 0; i < fields.length; i++) {
      const { element, value, type = "text" } = fields[i];
      if (!element || value == null || value === "") continue;

      if (type === "select") {
        await this.humanSelect(element, value);
      } else if (type === "file") {
        continue;
      } else {
        await this.humanType(element, String(value));
      }

      if (i < fields.length - 1) {
        await this.sleep(this.randomBetween(500, 1500));
      }
    }
  },
};

if (typeof window !== "undefined") {
  window.blitzHumanise = humanise;
}
