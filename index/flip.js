const loginCard = document.getElementById('loginCard');
    const signupCard = document.getElementById('signupCard');
    const toSignup = document.getElementById('toSignup');
    const toLogin = document.getElementById('toLogin');

    let isFlipped = false;

    function flipCard() {
      isFlipped = !isFlipped;

      gsap.to(loginCard, {
        rotateY: isFlipped ? -180 : 0,
        duration: 0.6,
        ease: 'power2.inOut',
        transformOrigin: 'center center'
      });

      gsap.to(signupCard, {
        rotateY: isFlipped ? 0 : 180,
        duration: 0.6,
        ease: 'power2.inOut',
        transformOrigin: 'center center'
      });
    }

    toSignup.addEventListener('click', flipCard);
    toLogin.addEventListener('click', flipCard);