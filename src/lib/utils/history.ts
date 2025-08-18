export const getElementAtViewportCenter = (): string | null => {
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    let el = document.elementFromPoint(x, y)
    while (el) {
        if (el.hasAttribute("data-block-id")) {
            break
        }
        el = el.parentElement;
    }

    if (!el) return null;
    return el.getAttribute("data-block-id");
};