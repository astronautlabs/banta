import 'reflect-metadata';
import 'zone.js';

import { Application } from '@alterior/runtime';
import { Service } from './service';

Application.bootstrap(Service);