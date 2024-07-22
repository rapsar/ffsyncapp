function addFireflies(count) {
    for (let i = 0; i < count; i++) {
        let firefly = document.createElement('div');
        firefly.className = 'firefly';
        firefly.style.left = Math.random() * 100 + 'vw';
        firefly.style.top = Math.random() * 100 + 'vh';
        firefly.style.animationDelay = Math.random() * 20 + 's';

        if (Math.random() < 0.5) {
            firefly.classList.add('glow');
        } else {
            firefly.classList.add('blink');
        }

        document.body.appendChild(firefly);
    }
}

window.onload = function() {
    addFireflies(100);
};
