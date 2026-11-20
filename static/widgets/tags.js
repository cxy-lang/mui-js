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

        this.el = h("div", { class: `tag-input ui-tag-input ${className}`.trim() },
            this.input,
            this.chips,
            this.note,
            datalist
        );

        this.input.addEventListener("keydown", (e) => this.#onKey(e));
        this.input.addEventListener("input", () => this.setNote(null));

        for (const t of tags) this.add(t, false);
    }

    setNote(msg, isError = false) {
        this.note.textContent = msg || "";
        this.note.classList.toggle("field-error", isError);
        this.note.hidden = !msg;
    }

    add(raw, notify = true) {
        const tag = (raw || "").trim();
        if (!tag) return false;

        if (tag.length > this.maxLength) {
            this.setNote(`Each ${this.noun} must be at most ${this.maxLength} characters.`, true);
            return false;
        }

        if (this.tags.includes(tag)) {
            this.setNote(`"${tag}" is already added.`, true);
            return false;
        }

        this.tags.push(tag);
        const chip = h("span", { class: "tag-chip ui-tag-chip", "data-tag": tag },
            h("span", { class: "tag-name ui-tag-name" }, tag),
            h("button", {
                type: "button",
                class: "tag-x ui-tag-remove",
                "aria-label": `Remove ${tag}`,
                onclick: () => this.remove(tag),
            }, this.removeIcon)
        );
        this.chips.append(chip);

        if (notify) this.onChange(this.tags);
        return true;
    }

    remove(tag) {
        const idx = this.tags.indexOf(tag);
        if (idx === -1) return;
        this.tags.splice(idx, 1);
        const chip = this.chips.querySelector(`[data-tag="${CSS.escape(tag)}"]`);
        if (chip) chip.remove();
        this.onChange(this.tags);
    }

    #onKey(e) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            if (this.add(this.input.value)) {
                this.input.value = "";
            }
        } else if (e.key === "Backspace" && !this.input.value && this.tags.length > 0) {
            this.remove(this.tags[this.tags.length - 1]);
        }
    }
}
