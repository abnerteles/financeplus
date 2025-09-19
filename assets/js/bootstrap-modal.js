// Bootstrap Modal - Funcionalidade básica para modais

class Modal {
  constructor(element, options = {}) {
    this.element = element;
    this.options = options;
    this.isShown = false;
    this.backdrop = null;
    
    this.init();
  }
  
  init() {
    // Adicionar event listeners para botões de fechar
    const closeButtons = this.element.querySelectorAll('[data-bs-dismiss="modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.hide());
    });
  }
  
  show() {
    if (this.isShown) return;
    
    this.isShown = true;
    
    // Disparar evento show.bs.modal
    const showEvent = new CustomEvent('show.bs.modal');
    this.element.dispatchEvent(showEvent);
    
    // Criar backdrop
    this.createBackdrop();
    
    // Mostrar modal
    this.element.style.display = 'block';
    this.element.classList.add('show');
    
    // Adicionar classe ao body
    document.body.classList.add('modal-open');
    
    // Para modal de login, adicionar classe especial
    if (this.element.id === 'loginModal') {
      document.body.classList.add('login-active');
    }
    
    // Focus no modal
    this.element.focus();
    
    // Event listener para ESC
    document.addEventListener('keydown', this.handleEscape.bind(this));
    
    // Disparar evento shown.bs.modal após um pequeno delay
    setTimeout(() => {
      const shownEvent = new CustomEvent('shown.bs.modal');
      this.element.dispatchEvent(shownEvent);
    }, 150);
  }
  
  hide() {
    if (!this.isShown) return;
    
    // Disparar evento hide.bs.modal
    const hideEvent = new CustomEvent('hide.bs.modal');
    this.element.dispatchEvent(hideEvent);
    
    this.isShown = false;
    
    // Esconder modal
    this.element.classList.remove('show');
    this.element.style.display = 'none';
    
    // Remover backdrop
    this.removeBackdrop();
    
    // Remover classe do body
    document.body.classList.remove('modal-open');
    
    // Para modal de login, remover classe especial
    if (this.element.id === 'loginModal') {
      document.body.classList.remove('login-active');
    }
    
    // Remover event listener do ESC
    document.removeEventListener('keydown', this.handleEscape.bind(this));
    
    // Disparar evento hidden.bs.modal após um pequeno delay
    setTimeout(() => {
      const hiddenEvent = new CustomEvent('hidden.bs.modal');
      this.element.dispatchEvent(hiddenEvent);
    }, 150);
  }
  
  createBackdrop() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop show';
    document.body.appendChild(this.backdrop);
    
    // Click no backdrop fecha o modal
    this.backdrop.addEventListener('click', () => this.hide());
  }
  
  removeBackdrop() {
    if (this.backdrop) {
      this.backdrop.remove();
      this.backdrop = null;
    }
  }
  
  handleEscape(event) {
    if (event.key === 'Escape') {
      this.hide();
    }
  }
  
  static getInstance(element) {
    if (!element._modalInstance) {
      element._modalInstance = new Modal(element);
    }
    return element._modalInstance;
  }
}

// Simular bootstrap object
window.bootstrap = {
  Modal: Modal
};

// Auto-inicializar modais quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar todos os modais
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal._modalInstance = new Modal(modal);
  });
  
  // Verificar se há usuário logado, se não, esconder conteúdo principal imediatamente
  const usuarioLogado = localStorage.getItem('financasUsuarioLogado') || sessionStorage.getItem('financasUsuarioLogado');
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (!usuarioLogado || !token) {
    // Não há usuário logado, esconder conteúdo principal
    document.body.classList.add('login-active');
  }
});