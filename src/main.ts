import './styles/main.css';
import { Aplicacion } from './ui/app/Aplicacion';

const raiz = document.getElementById('app');
if (!raiz) throw new Error('Falta el contenedor #app.');
new Aplicacion(raiz).iniciar();
