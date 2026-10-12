-- 25. ¿Cuál es el ingreso potencial máximo por noche si se rentan todas las habitaciones?
SELECT SUM(t.precio_base) AS ingreso_potencial 
FROM habitacion hab 
INNER JOIN tipo_habitacion t ON hab.id_tipo = t.id_tipo;