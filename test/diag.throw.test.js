// Este test intencionalmente lanza un error al importarse para comprobar
// si Vitest está importando/ejecutando los archivos de prueba.
throw new Error('diag-file-executed')
