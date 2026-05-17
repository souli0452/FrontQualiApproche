import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParametragesComponent } from './parametrages.component';

describe('ParametragesComponent', () => {
  let component: ParametragesComponent;
  let fixture: ComponentFixture<ParametragesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametragesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParametragesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
