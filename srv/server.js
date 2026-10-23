import cds from '@sap/cds';
import { cdsMiddleware } from './ui-component-middleware/index.js';

cds.on('bootstrap', cdsMiddleware);
