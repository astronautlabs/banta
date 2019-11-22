import { NgModule } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";

const MODULES = [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule
];

@NgModule({
    imports: MODULES,
    exports: MODULES
})
export class MaterialModule {
}