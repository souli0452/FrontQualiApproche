import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, Location } from '@angular/common';
import { NonConformiteService } from '../../../services/non-conformite.service';
import { Avatar } from 'primeng/avatar';
import { NonConformStatus } from '../../../enums';

@Component({
    templateUrl: './nc-detail.component.html',
    standalone:false
})
export class NcDetailComponent {
    nc: any = {};

    constructor(
        private route: ActivatedRoute,
        private nonConformiteService: NonConformiteService,
        private location: Location
    ) {}

    ngOnInit() {
        this.route.params.subscribe((params) => {
            this.nonConformiteService.findById(params['id']).subscribe((actuality) => {
                this.nc = actuality.body!;
            });
        });
    }


    goBack() {
        this.location.back();
    }

    protected readonly NonConformStatus = NonConformStatus;
}
