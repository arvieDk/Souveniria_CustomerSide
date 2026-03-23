(function() {
  var bar = document.getElementById('sticky-checkout-bar');
  if (!bar) return;

  function checkVisibility() {
    // Only show when cart page is active
    var cartPage = document.getElementById('page-cart');
    if (!cartPage || !cartPage.classList.contains('active')) {
      bar.style.transform = 'translateY(100%)';
      return;
    }

    // Hide when footer is visible
    var footer = cartPage.querySelector('footer');
    if (!footer) { bar.style.transform = 'translateY(0)'; return; }

    var footerRect = footer.getBoundingClientRect();
    var windowH = window.innerHeight;

    if (footerRect.top < windowH) {
      bar.style.transform = 'translateY(100%)';
    } else {
      bar.style.transform = 'translateY(0)';
    }
  }

  window.addEventListener('scroll', checkVisibility, {passive:true});
  window.addEventListener('resize', checkVisibility);

  // Also re-check when navigate() is called
  var origNavigate = window.navigate;
  window.navigate = function(page) {
    origNavigate(page);
    setTimeout(checkVisibility, 50);
  };

  // Initial check
  setTimeout(checkVisibility, 100);
})();

// ── Delivery mode switch ──
function switchDeliveryMode(mode) {
  var shipBtn = document.getElementById('dmode-ship');
  var pickupBtn = document.getElementById('dmode-pickup');
  var shipFields = document.getElementById('co-ship-fields');
  var pickupFields = document.getElementById('co-pickup-fields');
  var payCod = document.getElementById('pay-cod');
  var payPickup = document.getElementById('pay-pickup-cash');
  var payGcash = document.getElementById('pay-gcash');

  if (mode === 'ship') {
    shipBtn.classList.add('active'); pickupBtn.classList.remove('active');
    shipFields.style.display = 'block'; pickupFields.style.display = 'none';
    document.getElementById('co-shipping').textContent = '\u20B1120';
    // Show COD, hide Cash on Pick Up
    if (payCod) payCod.style.display = 'flex';
    if (payPickup) { payPickup.style.display = 'none'; payPickup.classList.remove('selected'); payPickup.querySelector('input').checked = false; }
    // Restore GCash as default if pickup-cash was selected
    if (payPickup && payPickup.classList.contains('selected')) {
      payGcash.classList.add('selected'); payGcash.querySelector('input').checked = true;
      selectPayment(payGcash, 'gcash');
    }
    updateTotal();
  } else {
    pickupBtn.classList.add('active'); shipBtn.classList.remove('active');
    pickupFields.style.display = 'block'; shipFields.style.display = 'none';
    document.getElementById('co-shipping').textContent = 'Free';
    // Hide COD (can't use COD for pickup), show Cash on Pick Up
    if (payCod) { payCod.style.display = 'none'; payCod.classList.remove('selected'); payCod.querySelector('input').checked = false; }
    if (payPickup) payPickup.style.display = 'flex';
    // Auto-select Cash on Pick Up
    document.querySelectorAll('.pay-opt').forEach(function(o){ o.classList.remove('selected'); o.querySelector('input').checked = false; });
    if (payPickup) { payPickup.classList.add('selected'); payPickup.querySelector('input').checked = true; }
    var instr = document.getElementById('payment-instructions');
    if (instr) { instr.style.display = 'block'; instr.innerHTML = '&#127968; Pay in <strong>cash</strong> when you pick up your order at the store. Please bring a valid ID and your Order Reference number. Store hours: Mon&ndash;Sat, 9AM&ndash;6PM.'; }
    updateTotal();
  }
}

// ── Courier selection ──
function selectCourier(el, fee) {
  document.querySelectorAll('.courier-opt').forEach(function(o){ o.classList.remove('selected'); o.querySelector('input').checked = false; });
  el.classList.add('selected');
  el.querySelector('input').checked = true;
  document.getElementById('co-shipping').textContent = '\u20B1' + fee;
  document.getElementById('ship-fee-display').textContent = fee;
  updateTotal();
}

// ── Pickup location selection ──
function selectPickup(el) {
  document.querySelectorAll('.pickup-loc').forEach(function(o){ o.classList.remove('selected'); o.querySelector('input').checked = false; });
  el.classList.add('selected');
  el.querySelector('input').checked = true;
}

// ── Payment selection ──
function selectPayment(el, type) {
  document.querySelectorAll('.pay-opt').forEach(function(o){ o.classList.remove('selected'); o.querySelector('input').checked = false; });
  el.classList.add('selected');
  el.querySelector('input').checked = true;
  var instr = document.getElementById('payment-instructions');
  if (!instr) return;
  if (type === 'gcash') {
    instr.style.display = 'block';
    instr.innerHTML = 'Send payment to GCash <strong>09XX-XXX-XXXX</strong> (Souveniria Official). Include your Order Reference in the remarks. Screenshot your receipt and upload it below or email it to us.';
  } else if (type === 'cod') {
    instr.style.display = 'block';
    instr.innerHTML = '&#128181; You will pay in <strong>cash</strong> when your order is delivered. Please prepare the exact amount. Additional COD fee may apply depending on your location.';
  } else if (type === 'pickup-cash') {
    instr.style.display = 'block';
    instr.innerHTML = '&#127968; Pay in <strong>cash</strong> when you pick up your order at the store. Please bring a valid ID and your Order Reference number. Store hours: Mon&ndash;Sat, 9AM&ndash;6PM.';
  } else {
    instr.style.display = 'none';
  }
}

// ── Billing address toggle ──
function selectBilling(el, same) {
  document.querySelectorAll('.billing-opt').forEach(function(o){ o.classList.remove('selected'); o.querySelector('input').checked = false; });
  el.classList.add('selected');
  el.querySelector('input').checked = true;
  var extra = document.getElementById('billing-extra-fields');
  if (extra) extra.style.display = same ? 'none' : 'block';
}

// ── Shipping region fee update ──
function updateShippingFee() {
  var region = document.querySelector('#co-ship-fields .co-select:nth-of-type(2)');
  if (!region) return;
  var val = region ? region.value : '';
  var fee = 120;
  if (val && val.indexOf('NCR') > -1) fee = 180;
  else if (val && val.indexOf('Other') > -1) fee = 250;
  document.getElementById('co-shipping').textContent = '\u20B1' + fee;
  if (document.getElementById('ship-fee-display')) document.getElementById('ship-fee-display').textContent = fee;
  updateTotal();
}

// ── Voucher ──
var coDiscountAmt = 0;
function applyCoVoucher() {
  var input = document.getElementById('co-voucher-input');
  if (!input) return;
  var code = input.value.trim().toUpperCase();
  var validCodes = { 'BICO20': {label:'20% off (max \u20B1200)',amt:140}, 'SOUVENIR10': {label:'10% off (max \u20B1100)',amt:70}, 'ALBAY5': {label:'5% off (max \u20B180)',amt:35}, 'FREESHIP':{label:'Free Shipping',amt:0,freeShip:true}, 'SHIPFREE2':{label:'Free Shipping',amt:0,freeShip:true} };
  if (!code) { if(typeof showToast !== 'undefined') showToast('Enter a voucher code.','\u26A0'); return; }
  if (validCodes[code]) {
    var v = validCodes[code];
    coDiscountAmt = v.amt;
    var banner = document.getElementById('co-voucher-banner');
    var msg = document.getElementById('co-voucher-msg');
    if (banner && msg) { msg.textContent = code + ' applied: ' + v.label; banner.style.display = 'flex'; }
    if (v.freeShip) { document.getElementById('co-shipping').textContent = 'Free'; }
    var discRow = document.getElementById('co-discount-row');
    var discVal = document.getElementById('co-discount-val');
    if (discRow && v.amt > 0) { discRow.style.display = 'flex'; discVal.textContent = '-\u20B1' + v.amt; }
    updateTotal();
    if(typeof showToast !== 'undefined') showToast('Voucher '+code+' applied!','\u{1F3AB}');
  } else {
    if(typeof showToast !== 'undefined') showToast('Invalid or expired code.','\u2715');
    input.style.borderColor = 'var(--accent)';
    setTimeout(function(){ input.style.borderColor = 'var(--border)'; }, 2000);
  }
}
function removeCoVoucher() {
  coDiscountAmt = 0;
  var banner = document.getElementById('co-voucher-banner');
  if (banner) banner.style.display = 'none';
  var discRow = document.getElementById('co-discount-row');
  if (discRow) discRow.style.display = 'none';
  var inp = document.getElementById('co-voucher-input');
  if (inp) inp.value = '';
  updateTotal();
  if(typeof showToast !== 'undefined') showToast('Voucher removed','\u2715');
}
function updateTotal() {
  var shipEl = document.getElementById('co-shipping');
  var ship = shipEl ? (shipEl.textContent === 'Free' ? 0 : parseInt(shipEl.textContent.replace(/[^0-9]/g,''))) : 120;
  var subtotal = 700;
  var total = subtotal + ship - coDiscountAmt;
  var totalEl = document.getElementById('co-total');
  if (totalEl) totalEl.textContent = '\u20B1' + total;
}

// ── Pay Now ──
function submitCheckout() {
  var contact = document.getElementById('co-contact');
  if (contact && !contact.value.trim()) {
    contact.style.borderColor = 'var(--accent)';
    contact.focus();
    if(typeof showToast !== 'undefined') showToast('Please enter your contact details.','\u26A0');
    setTimeout(function(){ contact.style.borderColor='var(--border)'; }, 2000);
    return;
  }
  if(typeof showToast !== 'undefined') showToast('Order placed! Check your email for confirmation.','\u2705');
}

function toggleEditProfile(editing) {
      var view = document.getElementById('profile-view');
      var edit = document.getElementById('profile-edit');
      if (!view || !edit) return;
      view.style.display = editing ? 'none' : 'block';
      edit.style.display = editing ? 'flex' : 'none';
      if (editing) edit.style.flexDirection = 'column';
    }

    function saveProfileChanges() {
      var fname = document.getElementById('edit-fname').value.trim();
      var lname = document.getElementById('edit-lname').value.trim();
      var email = document.getElementById('edit-email').value.trim();
      var phone = document.getElementById('edit-phone').value.trim();
      var address = document.getElementById('edit-address').value.trim();
      var pwd = document.getElementById('edit-password').value;

      // Basic validation
      if (!fname || !lname) {
        if (typeof showToast !== 'undefined') showToast('Please enter your full name.', '&#9888;');
        return;
      }
      if (!email || email.indexOf('@') < 0) {
        if (typeof showToast !== 'undefined') showToast('Please enter a valid email.', '&#9888;');
        return;
      }
      if (!pwd) {
        var pwdField = document.getElementById('edit-password');
        pwdField.style.borderColor = 'var(--accent)';
        setTimeout(function(){ pwdField.style.borderColor = 'var(--border)'; }, 2000);
        if (typeof showToast !== 'undefined') showToast('Please enter your current password to save.', '&#128274;');
        return;
      }

      // Update display
      document.getElementById('display-name').textContent = fname + ' ' + lname;
      document.getElementById('display-email').textContent = email;
      document.getElementById('display-phone').textContent = phone || '09xxxxxxxxx';
      document.getElementById('display-address').textContent = address || 'Legazpi, Albay';

      // Clear password field
      document.getElementById('edit-password').value = '';

      toggleEditProfile(false);
      if (typeof showToast !== 'undefined') showToast('Profile updated successfully!', '&#10003;');
    }

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); window.scrollTo(0,0); }
}
function switchTab(btn, tabName) {
  btn.closest('.tab-nav').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  const target = document.getElementById('tab-' + tabName);
  if (target) target.style.display = 'block';
}
function changeQty(delta) {
  const el = document.getElementById('qty-display');
  let val = parseInt(el.textContent) + delta;
  if (val < 1) val = 1;
  el.textContent = val;
}
function toggleDelivery(mode) {
  document.getElementById('ship-fields').style.display = mode === 'ship' ? 'block' : 'none';
  const pf = document.getElementById('pickup-fields');
  if (pf) pf.style.display = mode === 'pickup' ? 'block' : 'none';
  ['btn-ship','btn-pickup'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  const active = document.getElementById('btn-' + mode);
  if (active) active.classList.add('active');
}
function toggleSearchBar() {
  const bar = document.getElementById('search-bar');
  bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', function(e) {
  const card = e.target.closest('.product-card');
  if (card) navigate('product-detail');
});
document.addEventListener('click', function(e) {
  const sizeBtn = e.target.closest('.size-btn');
  if (sizeBtn) {
    sizeBtn.closest('.size-options').querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    sizeBtn.classList.add('active');
  }
});

function toggleFaq(btn) {
  const ans = btn.nextElementSibling;
  const icon = btn.querySelector('.faq-icon');
  if (ans.classList.contains('open')) {
    ans.classList.remove('open');
    ans.style.display = 'none';
    icon.innerHTML = '&#8744;';
  } else {
    ans.classList.add('open');
    ans.style.display = 'block';
    icon.innerHTML = '&#8743;';
  }
}

// Fix category nav - run after DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // All nav links are already set via onclick attributes
  // FAQ accordion init
  document.querySelectorAll('.faq-a:not(.open)').forEach(a => a.style.display = 'none');
});

// Sale countdown timer
(function(){
  var h=9,m=47,s=33;
  var t=setInterval(function(){
    s--; if(s<0){s=59;m--;} if(m<0){m=59;h--;} if(h<0){clearInterval(t);return;}
    var sh=document.getElementById('sale-hours');
    var sm=document.getElementById('sale-mins');
    var ss=document.getElementById('sale-secs');
    if(sh)sh.textContent=h<10?'0'+h:h;
    if(sm)sm.textContent=m<10?'0'+m:m;
    if(ss)ss.textContent=s<10?'0'+s:s;
  },1000);
})();

// Filter chips for sale page
document.addEventListener('click',function(e){
  var chip=e.target.closest('.filter-chip');
  if(chip){
    chip.closest('.filters-bar').querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active-chip'));
    chip.classList.add('active-chip');
  }
});

document.querySelectorAll('.drop-pill').forEach(function(pill){
  pill.addEventListener('click',function(){
    document.querySelectorAll('.drop-pill').forEach(function(p){p.classList.remove('active-drop');});
    this.classList.add('active-drop');
  });
});

function toggleCustomPanel() {
  var body = document.getElementById('custom-panel-body');
  var icon = document.getElementById('custom-toggle-icon');
  if (!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  icon.innerHTML = open ? '&#8744;' : '&#8743;';
}
function updateCustomPreview() {
  var txt = document.getElementById('custom-text');
  var prev = document.getElementById('preview-text');
  var cc = document.getElementById('char-count');
  if (!txt || !prev) return;
  var val = txt.value.trim();
  cc.textContent = txt.value.length;
  prev.textContent = val || 'Your text here';
}
function selectFont(el) {
  document.querySelectorAll('.font-opt').forEach(function(e){ e.classList.remove('active-font'); e.style.border='1.5px solid var(--border)'; });
  el.classList.add('active-font');
  el.style.border='1.5px solid var(--olive)';
  var prev = document.getElementById('preview-text');
  if (!prev) return;
  var f = el.getAttribute('data-font');
  if (f==='serif') { prev.style.fontFamily="Georgia,serif"; prev.style.fontStyle='normal'; prev.style.fontWeight='normal'; }
  else if (f==='script') { prev.style.fontFamily='cursive'; prev.style.fontStyle='italic'; prev.style.fontWeight='normal'; }
  else { prev.style.fontFamily="'Segoe UI',Arial,sans-serif"; prev.style.fontStyle='normal'; prev.style.fontWeight='700'; }
}
function selectPlace(el) {
  document.querySelectorAll('.place-btn').forEach(function(e){ e.classList.remove('active-place'); });
  el.classList.add('active-place');
}
function selectMotif(el) {
  document.querySelectorAll('.motif-btn').forEach(function(e){ e.classList.remove('active-motif'); e.style.border='1.5px solid var(--border)'; });
  el.classList.add('active-motif');
  el.style.border='1.5px solid var(--olive)';
  var motif = el.getAttribute('data-motif');
  var icons = {none:'',mayon:'&#9968;',pili:'&#127807;',wave:'&#127754;',flower:'&#127812;'};
  var prev = document.getElementById('custom-preview');
  if (prev) {
    var existing = prev.querySelector('span.motif-icon');
    if (existing) existing.remove();
    if (motif !== 'none') {
      var s = document.createElement('span');
      s.className = 'motif-icon';
      s.style.fontSize='18px';
      s.innerHTML = icons[motif];
      prev.insertBefore(s, prev.firstChild);
    }
  }
}
function selectColor(el, hex, name) {
  document.querySelectorAll('.color-swatch').forEach(function(e){ e.classList.remove('active-swatch'); e.style.border='2px solid transparent'; e.style.outline='none'; });
  el.classList.add('active-swatch');
  el.style.border='2px solid var(--dark-olive)';
  el.style.outline='2px solid var(--dark-olive)';
  el.style.outlineOffset='1px';
  var label = document.getElementById('selected-color-name');
  if (label) label.textContent = name;
  var prev = document.getElementById('preview-text');
  if (prev) prev.style.color = hex;
}
function toggleGiftNote() {
  var cb = document.getElementById('gift-note');
  var ta = document.getElementById('gift-note-text');
  if (!cb || !ta) return;
  ta.style.display = cb.checked ? 'block' : 'none';
}

// ============ WISHLIST SYSTEM ============
var wishlistItems = JSON.parse(localStorage.getItem('souveniria_wishlist') || '[]');

function updateWishlistCount() {
  var count = wishlistItems.length;
  var navLinks = document.querySelectorAll('a[onclick*="wishlist"]');
  navLinks.forEach(function(link) {
    var badge = link.querySelector('.wl-count');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('sup');
        badge.className = 'wl-count';
        badge.style.cssText = 'background:var(--accent);color:white;font-size:9px;padding:1px 4px;border-radius:8px;margin-left:3px;font-weight:700;';
        link.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  });
}

function toggleProductWishlist(btn) {
  var productId = 'pdp-bicol-laga-tote-bag';
  var productName = 'Bicol Laga Tote Bag';
  var isInList = wishlistItems.indexOf(productId) > -1;

  if (isInList) {
    wishlistItems = wishlistItems.filter(function(i){ return i !== productId; });
    btn.innerHTML = '&#9825; Wishlist';
    btn.style.color = '';
    btn.style.borderColor = '';
    showToast('Removed from Wish List', '&#9825;');
  } else {
    wishlistItems.push(productId);
    btn.innerHTML = '&#9829; Wishlisted';
    btn.style.color = 'var(--accent)';
    btn.style.borderColor = 'var(--accent)';
    showToast('Added to Wish List! View in Wish List tab.', '&#9829;');
  }
  localStorage.setItem('souveniria_wishlist', JSON.stringify(wishlistItems));
  updateWishlistCount();
}

// Make all product-card hearts work
document.addEventListener('click', function(e) {
  var heart = e.target.closest('.wish-heart');
  if (heart) {
    e.stopPropagation();
    var active = heart.classList.contains('active');
    heart.classList.toggle('active');
    if (!active) {
      showToast('Added to Wish List!', '&#9829;');
    } else {
      showToast('Removed from Wish List', '&#9825;');
    }
  }
});

// Add to cart from any card click shows toast
function addToCartToast() {
  showToast('Item added to cart! (3 items)', '&#128722;');
}

// ============ TOAST NOTIFICATION ============
function showToast(msg, icon) {
  var existing = document.getElementById('souveniria-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'souveniria-toast';
  toast.style.cssText = [
    'position:fixed',
    'top:80px',
    'right:24px',
    'background:var(--dark-olive)',
    'color:var(--cream)',
    'padding:11px 18px',
    'font-size:12.5px',
    'font-family:Segoe UI,Helvetica Neue,Arial,sans-serif',
    'z-index:9999',
    'display:flex',
    'align-items:center',
    'gap:8px',
    'box-shadow:0 4px 20px rgba(0,0,0,.22)',
    'border-left:3px solid var(--gold)',
    'max-width:320px',
    'animation:toastIn .25s ease',
    'cursor:pointer'
  ].join(';');
  toast.innerHTML = '<span style="font-size:15px;">' + (icon||'') + '</span><span>' + msg + '</span>';
  toast.onclick = function(){ toast.remove(); };
  document.body.appendChild(toast);
  setTimeout(function(){ if(toast.parentNode) { toast.style.animation='toastOut .3s ease forwards'; setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 300); } }, 3000);
}

// ============ DELIVERY TOGGLE (CHECKOUT) ============
// Override the existing toggleDelivery to also update the form
function toggleDelivery(mode) {
  var shipFields = document.getElementById('ship-fields');
  var pickupFields = document.getElementById('pickup-fields');
  var btnShip = document.getElementById('btn-ship');
  var btnPickup = document.getElementById('btn-pickup');

  if (shipFields) shipFields.style.display = mode === 'ship' ? 'block' : 'none';
  if (pickupFields) pickupFields.style.display = mode === 'pickup' ? 'block' : 'none';

  if (btnShip) { btnShip.classList.toggle('active', mode === 'ship'); }
  if (btnPickup) { btnPickup.classList.toggle('active', mode === 'pickup'); }
}

// ============ ADD TO CART BUTTON ============
document.addEventListener('click', function(e) {
  var addBtn = e.target.closest('.btn-primary');
  if (addBtn && addBtn.textContent.indexOf('Add to Cart') > -1) {
    showToast('Added to cart!', '&#128722;');
  }
});

// ============ FILTER CHIPS ============
document.addEventListener('click', function(e) {
  var chip = e.target.closest('.filter-chip');
  if (chip) {
    var parent = chip.closest('div');
    parent.querySelectorAll('.filter-chip').forEach(function(ch){ ch.classList.remove('active-chip'); });
    chip.classList.add('active-chip');
  }
});

// ============ CLEAR ALL WISHLIST ============
document.addEventListener('click', function(e) {
  if (e.target.textContent === 'Clear All' && e.target.closest('#page-wishlist')) {
    document.querySelectorAll('.wish-heart').forEach(function(h){ h.classList.remove('active'); });
    wishlistItems = [];
    localStorage.setItem('souveniria_wishlist', JSON.stringify(wishlistItems));
    updateWishlistCount();
    showToast('Wish List cleared', '&#9825;');
  }
});

// ============ ADD ALL TO CART (WISHLIST) ============
document.addEventListener('click', function(e) {
  if (e.target.textContent.indexOf('Add All to Cart') > -1) {
    showToast('All wish list items added to cart!', '&#128722;');
  }
});

// ============ INIT ============
document.addEventListener('DOMContentLoaded', function() {
  updateWishlistCount();
});

// ============ TOAST ANIMATION ============
var toastStyle = document.createElement('style');
toastStyle.textContent = [
  '@keyframes toastIn { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }',
  '@keyframes toastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(24px); } }'
].join('');
document.head.appendChild(toastStyle);

function openModal(id) {
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById(id).style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function closeAllModals() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.querySelectorAll('.site-modal').forEach(function(m){ m.style.display = 'none'; });
  document.body.style.overflow = '';
}

function claimVoucher(code, title, desc) {
  showToast('Voucher ' + code + ' copied! Use at checkout.', '&#127975;');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).catch(function(){});
  }
}

function applyVoucherCode() {
  var input = document.getElementById('voucher-code-input');
  var validCodes = ['BICO20','SOUVENIR10','ALBAY5','FREESHIP','SHIPFREE2'];
  if (!input) return;
  var val = input.value.trim().toUpperCase();
  if (!val) { showToast('Please enter a voucher code.', '&#9888;'); return; }
  if (validCodes.indexOf(val) > -1) {
    showToast('Voucher ' + val + ' added to your wallet!', '&#127975;');
    closeAllModals();
  } else {
    showToast('Invalid or expired voucher code.', '&#10005;');
    input.style.borderColor = 'var(--accent)';
    setTimeout(function(){ input.style.borderColor = 'var(--border)'; }, 2000);
  }
}

function switchVoucherTab(tab) {
  var codeBody = document.getElementById('vtab-code-body');
  var reviewBody = document.getElementById('vtab-review-body');
  var codeTab = document.getElementById('vtab-code');
  var reviewTab = document.getElementById('vtab-review');
  if (tab === 'code') {
    codeBody.style.display = 'block';
    reviewBody.style.display = 'none';
    codeTab.classList.add('active-vtab');
    reviewTab.classList.remove('active-vtab');
  } else {
    codeBody.style.display = 'none';
    reviewBody.style.display = 'block';
    codeTab.classList.remove('active-vtab');
    reviewTab.classList.add('active-vtab');
  }
}

var currentRating = 0;
var ratingLabels = ['','Poor','Fair','Good','Very Good','Excellent!'];
function setRating(val) {
  currentRating = val;
  document.querySelectorAll('.rate-star').forEach(function(star, i) {
    star.style.color = (i < val) ? 'var(--gold)' : 'var(--sand)';
  });
  var label = document.getElementById('rating-label');
  if (label) label.textContent = ratingLabels[val] || '';
}
function submitReview() {
  if (currentRating === 0) { showToast('Please select a star rating first.', '&#9733;'); return; }
  var txt = document.getElementById('review-text');
  if (txt && txt.value.trim().length < 5) { showToast('Please write at least a short review.', '&#9997;'); return; }
  closeAllModals();
  showToast('Review submitted! Voucher credited to your wallet.', '&#127975;');
  currentRating = 0;
}

function filterOrders(input) {
  var val = input.value.toLowerCase();
  var list = input.closest('.orders-list');
  if (!list) return;
  list.querySelector.querySelectorAll('.order-item').forEach(function(item) {
    var name = item.querySelector('h4');
    if (!name) return;
    item.style.display = name.textContent.toLowerCase().indexOf(val) > -1 ? '' : 'none';
  });
}

var cartEditMode = false;
function toggleCartEdit() {
  cartEditMode = !cartEditMode;
  var btn = document.getElementById('cart-edit-toggle');
  var removeBtns = document.querySelectorAll('.cart-remove-btn');
  if (btn) {
    btn.textContent = cartEditMode ? 'Done' : 'Edit';
    btn.style.color = cartEditMode ? 'var(--accent)' : 'var(--olive)';
  }
  removeBtns.forEach(function(b){
    b.style.display = cartEditMode ? 'inline-block' : 'none';
  });
  if (cartEditMode && typeof showToast !== 'undefined') showToast('Tap Remove to delete items from cart','&#9998;');
}
function removeCartItem(btn) {
  var row = btn.closest('tr');
  if (!row) return;
  var name = row.querySelector('.cart-item-name');
  var itemName = name ? name.textContent : 'Item';
  row.style.transition = 'opacity .25s';
  row.style.opacity = '0';
  setTimeout(function(){ row.remove(); if(typeof showToast!=='undefined') showToast(itemName+' removed from cart','&#128465;'); }, 250);
}