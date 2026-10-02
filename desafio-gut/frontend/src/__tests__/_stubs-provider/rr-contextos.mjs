// UTAC000.15 — expõe os contextos internos do react-router (a MESMA instância que o AppContext importa,
// porque o Vite externaliza o pacote em SSR) para o arnês lhes dar um valor, como faria um <Router>.
export { UNSAFE_LocationContext, UNSAFE_NavigationContext } from "react-router-dom";
