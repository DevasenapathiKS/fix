import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import swaggerSpec from './docs/swagger.js';

const app = express();
const distPath = path.resolve(process.cwd(), 'frontend', 'dist');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use(express.static(distPath));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api', routes);

app.get('*', (req, res, next) => {
	if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/docs')) {
		return next();
	}
	return res.sendFile(path.join(distPath, 'index.html'));
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
