// mui-js/static/widgets/tags.js
import { h } from "../core.js";

// Accessible, headless Tag Input: turns Enter or comma keystrokes into removable chips.
export class TagInput {
    constructor({
        tags = [],
        suggestions = [],
        placeholder = "type a tag, Enter",
        onChange = () => {},
        maxLength = 64,
        noun = "tag",
        label = "Add tag",
        removeIcon = "×",
        className = "",
    } = {}) {
        this.tags = [];
        this.onChange = onChange;
        this.maxLength = maxLength;
        this.noun = noun;
        this.removeIcon = removeIcon;

        const listId = `tags-${Math.random().toString(36).slice(2, 8)}`;
        this.input = h("input", {
            type: "text",
            placeholder,
            list: listId,
            autocomplete: "off",
            spellcheck: "false",
            class: "mono ui-tag-text-input",
            "aria-label": label,
        });

        this.chips = h("span", { class: "tag-chips ui-tag-chips" });
        this.note = h("small", { class: "field-note ui-field-note" });

        const datalist = h("datalist", { id: listId },
            suggestions.map((t) => h("option", { value: t }))
        );

        const row = h("div", { class: "tag-row ui-tag-row" }, this.chips, this.input, datalist);
        this.el = h("div", { class: `tag-input ui-tag-input ${className}`.trim() },
            row,
            this.note
        );

        for (const t of tags) this.#push(t);

        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                this.commit();
            } else if (e.key === "Backspace" && !this.input.value && this.tags.length > 0) {
                this.remove(this.tags[this.tags.length - 1]);
            }
        });

        this.input.addEventListener("blur", () => this.commit());
    }

    #push(tag) {
        this.tags.push(tag);
        const chip = h("span", { class: "tag-chip mono ui-tag-chip", "data-tag": tag },
            tag,
            h("button", {
                type: "button",
                class: "tag-x ui-tag-remove",
                "aria-label": `Remove ${tag}`,
                onclick: () => this.remove(tag),
            }, this.removeIcon)
        );
        this.chips.append(chip);
    }

    // Moves the typed text into a chip; returns false (with a note) if it is rejected.
    commit() {
        const text = this.input.value.replace(/,/g, "").trim();
        this.input.value = "";
        this.note.textContent = "";
        if (!text) return true;
        if (text.length > this.maxLength) {
            const article = /^[aeiou]/i.test(this.noun) ? "An" : "A";
            this.note.textContent = `${article} ${this.noun} is at most ${this.maxLength} characters.`;
            return false;
        }
        if (!this.tags.includes(text)) {
            this.#push(text);
            this.onChange(this.tags);
        }
        return true;
    }

    remove(tag) {
        this.tags = this.tags.filter((t) => t !== tag);
        for (const chip of this.chips.querySelectorAll(".tag-chip")) {
            if (chip.dataset.tag === tag) chip.remove();
        }
        this.onChange(this.tags);
    }

    set(tags) {
        this.tags = [];
        this.chips.replaceChildren();
        for (const t of tags) this.#push(t);
    }

    focus() {
        this.input.focus();
    }
}
