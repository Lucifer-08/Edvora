const toggleBtn = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

toggleBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    mobileMenu.classList.toggle('block');
});


const images = [
    {
        src: './180273.jpg',
        title: 'Title 1',
        desc: 'This is the description for Image 1. It changes as the image changes.'
    },
    {
        src: './9479043.jpg',
        title: 'Title 2',
        desc: 'This is the description for Image 2. It also changes dynamically.'
    },
    {
        src: './one-piece-skull-pirate-island-hd-wallpaper-uhdpaper.com-474@2@a.jpg',
        title: 'Title 3',
        desc: 'And here is the description for Image 3.'
    }
];

let index = 0;
setInterval(() => {
    index = (index + 1) % images.length;
    document.getElementById('slider-img').src = images[index].src;
    document.getElementById('image-title').innerText = images[index].title;
    document.getElementById('image-desc').innerText = images[index].desc;
}, 3000); // changes every 3 seconds
