// _ponte-ssr.mjs — o PRIMEIRO módulo que o servidor de testes carrega.
//
// ⚠️ PORQUE EXISTE (medido): o runner SSR do Vite 8 serve a um módulo carregado mais tarde uma
// instância de React DIFERENTE da do primeiro. Carregar aqui, primeiro, os pacotes que importam
// React faz com que TODOS os módulos seguintes (os componentes) recebam a MESMA instância.
// Mutação medida: desligar este load faz 15/15 falharem; ligá-lo faz 15/15 passarem.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { motion } from "framer-motion";
export { React, renderToStaticMarkup, MemoryRouter, Route, Routes, motion };
