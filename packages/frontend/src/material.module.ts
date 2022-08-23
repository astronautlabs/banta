import { NgModule } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { FullscreenOverlayContainer, OverlayContainer } from "@angular/cdk/overlay";

const MODULES = [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
];

@NgModule({
    imports: MODULES,
    exports: MODULES,
    providers: [
        {provide: OverlayContainer, useClass: FullscreenOverlayContainer}
    ]
})
export class MaterialModule {
}