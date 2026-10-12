-- 28. Resumen: ¿Cuántas habitaciones hay por cada estado?
SELECT estado, COUNT(*) AS cantidad 
FROM habitacion 
GROUP BY estado;