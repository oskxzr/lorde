// $(document).ready(function () {
//     const aura = $("#aura")[0]; // Get native DOM element
//     let isActive = false;
//     let timeoutId;
    
//     // Use requestAnimationFrame for smooth animation
//     function updateAuraPosition(e) {
//         cancelAnimationFrame(rafId);
//         rafId = requestAnimationFrame(() => {
//             // Use transform instead of left/top for better performance
//             const x = e.clientX - window.innerWidth * 0.25;
//             const y = e.clientY - window.innerWidth * 0.25;
//             console.log(x,y)
//             aura.style.transform = `translate(${x}px, ${y}px)`;
            
//             if (!isActive) {
//                 isActive = true;
//                 aura.classList.remove("inactive");
//             }
            
//             clearTimeout(timeoutId);
//             timeoutId = setTimeout(() => {
//                 isActive = false;
//                 aura.classList.add("inactive");
//             }, 1000);
//         });
//     }
    
//     // Use passive event listener for better scroll performance
//     let rafId;
//     document.addEventListener("mousemove", updateAuraPosition, { passive: true });
// });