FROM node:20-slim AS base

# Instalar dependencias para Prisma y otras herramientas básicas
RUN apt-get update && apt-get install -y openssl dumb-init netcat-openbsd postgresql-client && rm -rf /var/lib/apt/lists/*

# Instalar dependencias solo cuando sea necesario
FROM base AS deps
WORKDIR /app

# Instalar dependencias según el gestor de paquetes preferido
COPY package.json package-lock.json* ./
RUN npm ci

# Reconstruir el código fuente solo cuando sea necesario
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma genera el cliente durante la construcción pero no necesita conectarse a la DB en este punto
# Usamos una URL ficticia durante la construcción
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"

# Generate Prisma Client
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage
# Read more: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Copiar el script de inicialización para ejecutar migraciones
COPY --from=builder --chown=nextjs:nodejs /app/scripts/init-db.sh ./scripts/init-db.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usamos dumb-init para manejar señales correctamente y evitar procesos zombies
# El script de inicio ejecuta primero las migraciones y luego inicia el servidor
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "sh ./scripts/init-db.sh && node server.js"]
