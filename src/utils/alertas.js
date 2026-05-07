import Swal from 'sweetalert2';

// Configuração padrão para manter as cores do seu app
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const alertaSucesso = (msg) => Swal.fire('Sucesso!', msg, 'success');
export const alertaErro = (msg) => Swal.fire('Ops!', msg, 'error');
export const alertaAviso = (msg) => Swal.fire('Aviso', msg, 'warning');

// Bônus: Aquele alerta pequeno que aparece no canto da tela (estilo Toast)
export const toastSucesso = (msg) => Toast.fire({ icon: 'success', title: msg });
export const toastErro = (msg) => Toast.fire({ icon: 'error', title: msg });